import { DEFAULT_LIMITS, type ExecutionError, type ExecutionLimits, type FrameSnapshot, type HeapObjectSnapshot, type LocalSnapshot, type PrimitiveType, type RuntimeValue, type TraceEvent, type TraceKind, type TraceResult } from './types';

type TokenKind = 'identifier' | 'number' | 'string' | 'char' | 'symbol' | 'eof';
type Token = { kind: TokenKind; text: string; value?: string | number; line: number; column: number };

class JavaSubsetError extends Error {
  readonly type: string;
  readonly line?: number;
  readonly column?: number;

  constructor(type: string, message: string, token?: Pick<Token, 'line' | 'column'>) {
    super(message);
    this.name = 'JavaSubsetError';
    this.type = type;
    this.line = token?.line;
    this.column = token?.column;
  }
}

const primitiveTypes = new Set(['int', 'long', 'double', 'float', 'boolean', 'char']);
const modifiers = new Set(['public', 'private', 'protected', 'static']);
const numericOperators = new Set(['+', '-', '*', '/', '%']);
const assignmentOperators = new Set(['=', '+=', '-=', '*=', '/=', '%=']);

type Expr =
  | { kind: 'literal'; value: RuntimeValue | { kind: 'string-literal'; value: string }; line: number }
  | { kind: 'identifier'; name: string; line: number }
  | { kind: 'new-object'; className: string; line: number }
  | { kind: 'new-array'; elementType: string; size?: Expr; values?: Expr[]; line: number }
  | { kind: 'array-initializer'; values: Expr[]; line: number }
  | { kind: 'member'; object: Expr; name: string; line: number }
  | { kind: 'index'; object: Expr; index: Expr; line: number }
  | { kind: 'call'; callee: Expr; args: Expr[]; line: number }
  | { kind: 'binary'; left: Expr; operator: string; right: Expr; line: number }
  | { kind: 'unary'; operator: string; operand: Expr; line: number }
  | { kind: 'assignment'; target: Expr; operator: string; value: Expr; line: number }
  | { kind: 'postfix'; target: Expr; operator: string; line: number };

type Statement =
  | { kind: 'block'; statements: Statement[]; line: number }
  | { kind: 'variable'; type: string; name: string; initializer?: Expr; line: number }
  | { kind: 'expression'; expression: Expr; line: number }
  | { kind: 'if'; condition: Expr; thenBranch: Statement; elseBranch?: Statement; line: number }
  | { kind: 'while'; condition: Expr; body: Statement; line: number }
  | { kind: 'for'; initializer?: Statement; condition?: Expr; update?: Expr; body: Statement; line: number }
  | { kind: 'return'; value?: Expr; line: number }
  | { kind: 'empty'; line: number };

type Parameter = { type: string; name: string; line: number };
type FieldDecl = { type: string; name: string; line: number };
type MethodDecl = { name: string; returnType: string; parameters: Parameter[]; body: Statement[]; isStatic: boolean; line: number };
type ClassDecl = { name: string; fields: FieldDecl[]; methods: MethodDecl[]; line: number };
type Program = { classes: ClassDecl[] };

const lexicalTwoChar = new Set(['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=']);
const singleSymbols = new Set('{}()[];,.+-*/%!=<>');

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const advance = (): string => {
    const char = source[index++] ?? '';
    if (char === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return char;
  };
  const add = (kind: TokenKind, text: string, tokenLine: number, tokenColumn: number, value?: string | number) => {
    tokens.push({ kind, text, line: tokenLine, column: tokenColumn, ...(value === undefined ? {} : { value }) });
  };

  while (index < source.length) {
    const char = source[index]!;
    if (/\s/.test(char)) {
      advance();
      continue;
    }
    if (char === '/' && source[index + 1] === '/') {
      while (index < source.length && advance() !== '\n') { /* skip line comment */ }
      continue;
    }
    if (char === '/' && source[index + 1] === '*') {
      const start = { line, column };
      advance();
      advance();
      let closed = false;
      while (index < source.length) {
        if (source[index] === '*' && source[index + 1] === '/') {
          advance();
          advance();
          closed = true;
          break;
        }
        advance();
      }
      if (!closed) throw new JavaSubsetError('SyntaxError', 'Unterminated block comment.', start);
      continue;
    }

    const tokenLine = line;
    const tokenColumn = column;
    if (/[A-Za-z_$]/.test(char)) {
      let text = '';
      while (index < source.length && /[A-Za-z0-9_$]/.test(source[index]!)) text += advance();
      add('identifier', text, tokenLine, tokenColumn);
      continue;
    }
    if (/[0-9]/.test(char)) {
      let text = '';
      while (index < source.length && /[0-9]/.test(source[index]!)) text += advance();
      if (source[index] === '.' && /[0-9]/.test(source[index + 1] ?? '')) {
        text += advance();
        while (index < source.length && /[0-9]/.test(source[index]!)) text += advance();
      }
      const value = Number(text);
      if (!Number.isFinite(value)) throw new JavaSubsetError('SyntaxError', `Invalid numeric literal “${text}”.`, { line: tokenLine, column: tokenColumn });
      add('number', text, tokenLine, tokenColumn, value);
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = advance();
      let value = '';
      let closed = false;
      while (index < source.length) {
        const next = advance();
        if (next === quote) {
          closed = true;
          break;
        }
        if (next === '\n') throw new JavaSubsetError('SyntaxError', 'A string or character literal cannot cross a line.', { line: tokenLine, column: tokenColumn });
        if (next === '\\') {
          if (index >= source.length) break;
          const escaped = advance();
          const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '\\': '\\', '"': '"', "'": "'" };
          if (!(escaped in escapes)) throw new JavaSubsetError('UnsupportedEscape', `Escape sequence \\${escaped} is outside the supported subset.`, { line: tokenLine, column: tokenColumn });
          value += escapes[escaped]!;
        } else {
          value += next;
        }
      }
      if (!closed) throw new JavaSubsetError('SyntaxError', 'Unterminated string or character literal.', { line: tokenLine, column: tokenColumn });
      if (quote === "'" && [...value].length !== 1) throw new JavaSubsetError('SyntaxError', 'A char literal must contain exactly one character.', { line: tokenLine, column: tokenColumn });
      add(quote === '"' ? 'string' : 'char', quote, tokenLine, tokenColumn, value);
      continue;
    }

    const pair = source.slice(index, index + 2);
    if (lexicalTwoChar.has(pair)) {
      advance();
      advance();
      add('symbol', pair, tokenLine, tokenColumn);
      continue;
    }
    if (singleSymbols.has(char)) {
      advance();
      add('symbol', char, tokenLine, tokenColumn);
      continue;
    }
    throw new JavaSubsetError('UnsupportedSyntax', `Unsupported character “${char}”.`, { line: tokenLine, column: tokenColumn });
  }
  tokens.push({ kind: 'eof', text: '<end of file>', line, column });
  return tokens;
}

class Parser {
  private cursor = 0;
  private readonly classNames = new Set<string>();
  constructor(private readonly tokens: Token[]) {
    for (let index = 0; index < tokens.length - 1; index += 1) {
      if (tokens[index]!.text === 'class' && tokens[index + 1]!.kind === 'identifier') this.classNames.add(tokens[index + 1]!.text);
    }
  }

  parseProgram(): Program {
    const classes: ClassDecl[] = [];
    while (!this.atEnd()) {
      const leading = this.parseModifiers();
      if (!this.match('class')) this.fail('UnsupportedSyntax', 'Only class declarations are supported at the top level. Package and import declarations are not supported.', this.current());
      const classToken = this.previous();
      const name = this.expectIdentifier('Expected a class name.');
      this.expect('{', 'Expected “{” after the class name.');
      const fields: FieldDecl[] = [];
      const methods: MethodDecl[] = [];
      while (!this.check('}') && !this.atEnd()) {
        const memberModifiers = this.parseModifiers();
        const typeToken = this.current();
        const type = this.parseType();
        const memberName = this.expectIdentifier('Expected a field or method name.');
        if (this.match('(')) {
          if (!memberModifiers.has('static')) this.fail('UnsupportedSyntax', 'Only static methods are supported in this subset.', memberName);
          const parameters = this.parseParameters();
          const body = this.parseBlock().statements;
          methods.push({ name: memberName.text, returnType: type, parameters, body, isStatic: memberModifiers.has('static'), line: typeToken.line });
        } else {
          if (type === 'void') this.fail('SyntaxError', 'Fields cannot have type void.', typeToken);
          if (memberModifiers.has('static')) this.fail('UnsupportedSyntax', 'Static fields are not supported; use local variables or instance fields.', memberName);
          if (this.match('=')) this.fail('UnsupportedSyntax', 'Field initializers are not supported; declare the field and assign it in a method.', this.previous());
          this.expect(';', 'Expected “;” after a field declaration.');
          fields.push({ type, name: memberName.text, line: typeToken.line });
        }
      }
      this.expect('}', 'Expected “}” to close the class.');
      classes.push({ name: name.text, fields, methods, line: classToken.line });
      if (leading.has('static')) this.fail('SyntaxError', 'A top-level class cannot be static.', classToken);
    }
    if (classes.length === 0) this.fail('SyntaxError', 'Add a class declaration to run this program.', this.current());
    const names = new Set<string>();
    for (const declaration of classes) {
      if (names.has(declaration.name)) this.fail('SyntaxError', `Duplicate class “${declaration.name}”.`, { ...this.current(), line: declaration.line });
      names.add(declaration.name);
      const methodNames = new Set<string>();
      for (const method of declaration.methods) {
        if (methodNames.has(method.name)) this.fail('UnsupportedSyntax', `Overloaded methods named “${method.name}” are not supported.`, { ...this.current(), line: method.line });
        methodNames.add(method.name);
      }
    }
    return { classes };
  }

  private parseModifiers(): Set<string> {
    const result = new Set<string>();
    while (this.current().kind === 'identifier' && modifiers.has(this.current().text)) {
      const modifier = this.advance().text;
      if (result.has(modifier)) this.fail('SyntaxError', `Duplicate modifier “${modifier}”.`, this.previous());
      result.add(modifier);
    }
    return result;
  }

  private parseParameters(): Parameter[] {
    const parameters: Parameter[] = [];
    if (!this.check(')')) {
      do {
        const token = this.current();
        const type = this.parseType();
        if (type === 'void') this.fail('SyntaxError', 'Method parameters cannot have type void.', token);
        const name = this.expectIdentifier('Expected a parameter name.');
        if (parameters.some((parameter) => parameter.name === name.text)) this.fail('SyntaxError', `Duplicate parameter “${name.text}”.`, name);
        parameters.push({ type, name: name.text, line: token.line });
      } while (this.match(','));
    }
    this.expect(')', 'Expected “)” after method parameters.');
    return parameters;
  }

  private parseType(): string {
    const token = this.current();
    if (token.kind !== 'identifier' || token.text === 'class' || token.text === 'new') this.fail('UnsupportedSyntax', `Expected a supported type, found “${token.text}”.`, token);
    if (!(primitiveTypes.has(token.text) || token.text === 'void' || token.text === 'String' || this.classNames.has(token.text))) {
      this.fail('UnsupportedSyntax', `Type “${token.text}” is not supported by the Java subset.`, token);
    }
    let result = this.advance().text;
    if (this.match('[')) {
      this.expect(']', 'Array types use empty brackets, for example int[].');
      result += '[]';
      if (this.check('[')) this.fail('UnsupportedSyntax', 'Only one-dimensional arrays are supported.', this.current());
    }
    if (result === 'void[]') this.fail('SyntaxError', 'void cannot be an array element type.', token);
    return result;
  }

  private parseBlock(): Extract<Statement, { kind: 'block' }> {
    const open = this.expect('{', 'Expected a method or block body.');
    const statements: Statement[] = [];
    while (!this.check('}') && !this.atEnd()) statements.push(this.parseStatement());
    this.expect('}', 'Expected “}” to close the block.');
    return { kind: 'block', statements, line: open.line };
  }

  private parseStatement(): Statement {
    if (this.check('{')) return this.parseBlock();
    if (this.match(';')) return { kind: 'empty', line: this.previous().line };
    if (this.match('if')) {
      const start = this.previous();
      this.expect('(', 'Expected “(” after if.');
      const condition = this.parseExpression();
      this.expect(')', 'Expected “)” after the if condition.');
      const thenBranch = this.parseStatement();
      const elseBranch = this.match('else') ? this.parseStatement() : undefined;
      return { kind: 'if', condition, thenBranch, ...(elseBranch ? { elseBranch } : {}), line: start.line };
    }
    if (this.match('while')) {
      const start = this.previous();
      this.expect('(', 'Expected “(” after while.');
      const condition = this.parseExpression();
      this.expect(')', 'Expected “)” after the while condition.');
      const body = this.parseStatement();
      return { kind: 'while', condition, body, line: start.line };
    }
    if (this.match('for')) {
      const start = this.previous();
      this.expect('(', 'Expected “(” after for.');
      let initializer: Statement | undefined;
      if (this.match(';')) {
        // Empty loop initializer.
      } else if (this.looksLikeVariableDeclaration()) {
        initializer = this.parseVariableDeclaration(true);
      } else {
        const expression = this.parseExpression();
        this.expect(';', 'Expected “;” after the for-loop initializer.');
        initializer = { kind: 'expression', expression, line: expression.line };
      }
      const condition = this.check(';') ? undefined : this.parseExpression();
      this.expect(';', 'Expected “;” after the for-loop condition.');
      const update = this.check(')') ? undefined : this.parseExpression();
      this.expect(')', 'Expected “)” after the for-loop update.');
      const body = this.parseStatement();
      return { kind: 'for', ...(initializer ? { initializer } : {}), ...(condition ? { condition } : {}), ...(update ? { update } : {}), body, line: start.line };
    }
    if (this.match('return')) {
      const start = this.previous();
      const value = this.check(';') ? undefined : this.parseExpression();
      this.expect(';', 'Expected “;” after return.');
      return { kind: 'return', ...(value ? { value } : {}), line: start.line };
    }
    if (this.current().text === 'switch' || this.current().text === 'do' || this.current().text === 'try' || this.current().text === 'throw' || this.current().text === 'break' || this.current().text === 'continue' || this.current().text === 'synchronized') {
      this.fail('UnsupportedSyntax', `“${this.current().text}” statements are outside the supported subset.`, this.current());
    }
    if (this.looksLikeVariableDeclaration()) return this.parseVariableDeclaration(true);
    const expression = this.parseExpression();
    this.expect(';', 'Expected “;” after the statement.');
    return { kind: 'expression', expression, line: expression.line };
  }

  private parseVariableDeclaration(consumeSemicolon: boolean): Extract<Statement, { kind: 'variable' }> {
    const token = this.current();
    const type = this.parseType();
    if (type === 'void') this.fail('SyntaxError', 'Local variables cannot have type void.', token);
    const name = this.expectIdentifier('Expected a variable name.');
    let initializer: Expr | undefined;
    if (this.match('=')) initializer = this.parseExpression();
    if (consumeSemicolon) this.expect(';', 'Expected “;” after the variable declaration.');
    return { kind: 'variable', type, name: name.text, ...(initializer ? { initializer } : {}), line: token.line };
  }

  private looksLikeVariableDeclaration(): boolean {
    let offset = 0;
    const first = this.peek(offset);
    if (first.kind !== 'identifier' || !(primitiveTypes.has(first.text) || first.text === 'String' || this.classNames.has(first.text))) return false;
    offset += 1;
    while (this.peek(offset).text === '[' && this.peek(offset + 1).text === ']') offset += 2;
    const variable = this.peek(offset);
    const afterVariable = this.peek(offset + 1);
    return variable.kind === 'identifier' && ['=', ';'].includes(afterVariable.text);
  }

  private parseExpression(minPrecedence = 1): Expr {
    let left = this.parseUnary();
    while (true) {
      const operator = this.current().text;
      const precedence = this.precedence(operator);
      if (precedence < minPrecedence) break;
      const token = this.advance();
      const rightAssociative = assignmentOperators.has(operator);
      const right = this.parseExpression(precedence + (rightAssociative ? 0 : 1));
      if (rightAssociative) {
        if (!['identifier', 'member', 'index'].includes(left.kind)) this.fail('SyntaxError', 'The left side of an assignment must be a variable, field, or array element.', token);
        left = { kind: 'assignment', target: left, operator, value: right, line: token.line };
      } else {
        left = { kind: 'binary', left, operator, right, line: token.line };
      }
    }
    return left;
  }

  private precedence(operator: string): number {
    if (assignmentOperators.has(operator)) return 1;
    if (operator === '||') return 2;
    if (operator === '&&') return 3;
    if (operator === '==' || operator === '!=') return 4;
    if (['<', '<=', '>', '>='].includes(operator)) return 5;
    if (operator === '+' || operator === '-') return 6;
    if (operator === '*' || operator === '/' || operator === '%') return 7;
    return 0;
  }

  private parseUnary(): Expr {
    if (['!', '-', '+', '++', '--'].includes(this.current().text)) {
      const token = this.advance();
      const operand = this.parseUnary();
      if ((token.text === '++' || token.text === '--') && !['identifier', 'member', 'index'].includes(operand.kind)) this.fail('SyntaxError', 'Increment and decrement need a variable, field, or array element.', token);
      return { kind: 'unary', operator: token.text, operand, line: token.line };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let expression = this.parsePrimary();
    while (true) {
      if (this.match('.')) {
        const name = this.expectIdentifier('Expected a member name after “.”.');
        expression = { kind: 'member', object: expression, name: name.text, line: name.line };
      } else if (this.match('[')) {
        const index = this.parseExpression();
        this.expect(']', 'Expected “]” after the array index.');
        expression = { kind: 'index', object: expression, index, line: expression.line };
      } else if (this.match('(')) {
        const args: Expr[] = [];
        if (!this.check(')')) {
          do args.push(this.parseExpression()); while (this.match(','));
        }
        this.expect(')', 'Expected “)” after arguments.');
        expression = { kind: 'call', callee: expression, args, line: expression.line };
      } else if (this.match('++') || this.match('--')) {
        const operator = this.previous();
        if (!['identifier', 'member', 'index'].includes(expression.kind)) this.fail('SyntaxError', 'Increment and decrement need a variable, field, or array element.', operator);
        expression = { kind: 'postfix', target: expression, operator: operator.text, line: operator.line };
      } else {
        return expression;
      }
    }
  }

  private parsePrimary(): Expr {
    const token = this.advance();
    if (token.kind === 'number') return { kind: 'literal', value: { kind: 'primitive', type: token.text.includes('.') ? 'double' : 'int', value: token.value as number }, line: token.line };
    if (token.kind === 'string') return { kind: 'literal', value: { kind: 'string-literal', value: token.value as string }, line: token.line };
    if (token.kind === 'char') return { kind: 'literal', value: { kind: 'primitive', type: 'char', value: token.value as string }, line: token.line };
    if (token.kind === 'identifier') {
      if (token.text === 'true' || token.text === 'false') return { kind: 'literal', value: { kind: 'primitive', type: 'boolean', value: token.text === 'true' }, line: token.line };
      if (token.text === 'null') return { kind: 'literal', value: { kind: 'null' }, line: token.line };
      if (token.text === 'new') return this.parseNewExpression(token);
      return { kind: 'identifier', name: token.text, line: token.line };
    }
    if (token.text === '(') {
      const expression = this.parseExpression();
      this.expect(')', 'Expected “)” after the expression.');
      return expression;
    }
    if (token.text === '{') {
      const values: Expr[] = [];
      if (!this.check('}')) do values.push(this.parseExpression()); while (this.match(','));
      this.expect('}', 'Expected “}” after the array initializer.');
      return { kind: 'array-initializer', values, line: token.line };
    }
    this.fail('UnsupportedSyntax', `Expected an expression, found “${token.text}”.`, token);
  }

  private parseNewExpression(start: Token): Expr {
    const typeToken = this.expectIdentifier('Expected a class name or array element type after new.');
    if (this.match('(')) {
      if (!this.check(')')) this.fail('UnsupportedSyntax', 'Constructors with arguments are not supported; use a no-argument object allocation.', this.current());
      this.advance();
      return { kind: 'new-object', className: typeToken.text, line: start.line };
    }
    if (this.match('[')) {
      if (this.match(']')) {
        if (this.match('{')) {
          const values: Expr[] = [];
          if (!this.check('}')) do values.push(this.parseExpression()); while (this.match(','));
          this.expect('}', 'Expected “}” after the array initializer.');
          return { kind: 'new-array', elementType: typeToken.text, values, line: start.line };
        }
        if (this.check('[')) this.fail('UnsupportedSyntax', 'Multidimensional arrays are not supported.', this.current());
        return { kind: 'new-array', elementType: typeToken.text, values: [], line: start.line };
      }
      const size = this.parseExpression();
      this.expect(']', 'Expected “]” after the array size.');
      if (this.check('[')) this.fail('UnsupportedSyntax', 'Multidimensional arrays are not supported.', this.current());
      return { kind: 'new-array', elementType: typeToken.text, size, line: start.line };
    }
    this.fail('UnsupportedSyntax', 'Object allocation requires parentheses, and array allocation requires brackets.', typeToken);
  }

  private expectIdentifier(message: string): Token {
    if (this.current().kind !== 'identifier') this.fail('SyntaxError', message, this.current());
    return this.advance();
  }
  private expect(text: string, message: string): Token {
    if (this.check(text)) return this.advance();
    this.fail('SyntaxError', message, this.current());
  }
  private match(text: string): boolean {
    if (!this.check(text)) return false;
    this.advance();
    return true;
  }
  private check(text: string): boolean { return this.current().text === text; }
  private advance(): Token {
    if (!this.atEnd()) this.cursor += 1;
    return this.previous();
  }
  private current(): Token { return this.tokens[this.cursor] ?? this.tokens[this.tokens.length - 1]!; }
  private previous(): Token { return this.tokens[Math.max(0, this.cursor - 1)]!; }
  private peek(offset: number): Token { return this.tokens[Math.min(this.cursor + offset, this.tokens.length - 1)]!; }
  private atEnd(): boolean { return this.current().kind === 'eof'; }
  private fail(type: string, message: string, token: Pick<Token, 'line' | 'column'>): never { throw new JavaSubsetError(type, message, token); }
}

type InternalBinding = { type: string; value: RuntimeValue };
type Scope = Map<string, InternalBinding>;
type Frame = { id: string; className: string; method: MethodDecl; scopes: Scope[] };
type InternalHeapObject = {
  id: string;
  typeName: string;
  kind: 'object' | 'array' | 'string';
  fields: Map<string, InternalBinding>;
  elements: RuntimeValue[];
  elementType?: string;
  text?: string;
};
type LValue = { type: string; get: () => RuntimeValue; set: (value: RuntimeValue) => void; description: string };
type StatementFlow = undefined | { kind: 'return'; value?: RuntimeValue };

const NULL: RuntimeValue = { kind: 'null' };
const UNINITIALIZED: RuntimeValue = { kind: 'uninitialized' };
const numericTypes: PrimitiveType[] = ['int', 'long', 'float', 'double'];

function isPrimitiveType(type: string): type is PrimitiveType { return primitiveTypes.has(type); }
function isNumeric(value: RuntimeValue): value is Extract<RuntimeValue, { kind: 'primitive' }> { return value.kind === 'primitive' && numericTypes.includes(value.type); }
function isReferenceType(type: string): boolean { return type.endsWith('[]') || type === 'String' || (!primitiveTypes.has(type) && type !== 'void'); }
function valueType(value: RuntimeValue): string {
  if (value.kind === 'null') return 'null';
  if (value.kind === 'uninitialized') return 'uninitialized';
  if (value.kind === 'void') return 'void';
  if (value.kind === 'reference') return 'reference';
  return value.type;
}

class ReturnSignal extends Error {
  constructor(readonly value?: RuntimeValue) { super('return'); }
}

class Interpreter {
  private readonly classes = new Map<string, ClassDecl>();
  private readonly methods = new Map<string, MethodDecl>();
  private readonly heap = new Map<string, InternalHeapObject>();
  private readonly callStack: Frame[] = [];
  private readonly literalPool = new Map<string, string>();
  private readonly literalRoots = new Set<string>();
  private readonly events: TraceEvent[] = [];
  private output = '';
  private steps = 0;
  private traceValueUnits = 0;
  private nextObjectId = 1;
  private nextFrameId = 1;
  private currentLine = 1;
  private startedAt = 0;
  private readonly limits: ExecutionLimits;
  private program?: Program;

  constructor(limits: Partial<ExecutionLimits> = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  run(source: string): TraceResult {
    this.startedAt = Date.now();
    if (source.length > this.limits.maxSourceLength) {
      return this.result({ type: 'SourceLimitExceeded', message: `Source is limited to ${this.limits.maxSourceLength.toLocaleString()} characters.` });
    }
    try {
      this.program = new Parser(tokenize(source)).parseProgram();
      for (const declaration of this.program.classes) {
        this.classes.set(declaration.name, declaration);
        for (const method of declaration.methods) this.methods.set(`${declaration.name}.${method.name}`, method);
      }
      const entry = this.findEntryPoint();
      if (!entry) throw new JavaSubsetError('EntryPointNotFound', 'Add a static void main(String[] args) method (or a static no-argument main method).');
      if (entry.parameters.length > 1 || (entry.parameters.length === 1 && entry.parameters[0]!.type !== 'String[]')) {
        throw new JavaSubsetError('UnsupportedEntryPoint', 'The supported entry point takes no parameters or one String[] parameter.');
      }
      this.invoke(entry.className, entry.method, entry.parameters.length ? [this.allocateArray('String', [], entry.method.line)] : [], entry.method.line);
      this.emit({ line: entry.method.line, kind: 'complete', label: 'Program finished', why: 'The entry method returned; there are no more statements to execute.', memoryChange: 'The active call stack is empty. Heap objects remain in the snapshot so their reachability can be inspected.', next: 'Rewind or edit the source to run another trace.' });
      return this.result();
    } catch (error) {
      const executionError = this.toExecutionError(error);
      if (error instanceof JavaSubsetError && error.name === 'JavaSubsetError' && this.program && this.events.length > 0) {
        try {
          this.emit({ line: error.line ?? this.currentLine, kind: 'exception', label: `${error.type}: ${error.message}`, why: 'Execution stopped at the first unsupported construct or runtime error; no later state is inferred.', memoryChange: 'The displayed values are the last completed trace snapshot.', next: 'Correct the line shown or keep the program within the documented subset.', commonMistake: 'Do not treat this interpreter as a full Java compiler or JVM.' , exception: { type: error.type, message: error.message } });
        } catch { /* retain the prior trace if the trace cap was reached */ }
      }
      return this.result(executionError);
    }
  }

  private result(error?: ExecutionError): TraceResult {
    return { events: this.events, ...(error ? { error } : {}), output: this.output, steps: this.steps, elapsedMs: Math.max(0, Date.now() - this.startedAt) };
  }

  private findEntryPoint(): { className: string; method: MethodDecl; parameters: Parameter[] } | undefined {
    for (const declaration of this.program?.classes ?? []) {
      const candidate = declaration.methods.find((method) => method.name === 'main' && method.isStatic && method.returnType === 'void');
      if (candidate) return { className: declaration.name, method: candidate, parameters: candidate.parameters };
    }
    return undefined;
  }

  private tick(line: number): void {
    this.currentLine = line;
    this.steps += 1;
    if (this.steps > this.limits.maxSteps) throw new JavaSubsetError('ExecutionLimitExceeded', `Execution exceeded the ${this.limits.maxSteps.toLocaleString()}-step budget.`, { line, column: 1 });
  }

  private emit(details: {
    line: number;
    kind: TraceKind;
    label: string;
    why: string;
    memoryChange: string;
    next?: string;
    commonMistake?: string;
    exception?: { type: string; message: string };
  }): void {
    if (this.events.length >= this.limits.maxTraceEvents) throw new JavaSubsetError('TraceLimitExceeded', `Trace exceeded ${this.limits.maxTraceEvents.toLocaleString()} snapshots.`, { line: details.line, column: 1 });
    const frameUnits = this.callStack.reduce((total, frame) => total + 4 + frame.scopes.reduce((scopeTotal, scope) => scopeTotal + scope.size * 2, 0), 0);
    const heapUnits = [...this.heap.values()].reduce((total, object) => total + 4 + object.fields.size * 2 + object.elements.length + Math.ceil((object.text?.length ?? 0) / 32), 0);
    this.traceValueUnits += 8 + frameUnits + heapUnits;
    if (this.traceValueUnits > this.limits.maxTraceValueUnits) throw new JavaSubsetError('TraceMemoryLimitExceeded', `Trace state exceeded the ${this.limits.maxTraceValueUnits.toLocaleString()}-unit snapshot budget. Reduce the number or size of live objects and rerun.`, { line: details.line, column: 1 });
    this.events.push({
      index: this.events.length,
      line: Math.max(1, details.line),
      kind: details.kind,
      label: details.label,
      why: details.why,
      memoryChange: details.memoryChange,
      unchanged: 'State not mentioned in this event is unchanged from the previous snapshot.',
      next: details.next ?? 'Step forward to inspect the next executed statement.',
      commonMistake: details.commonMistake ?? 'A reference points to an object; it is not a copy of that object.',
      frames: this.snapshotFrames(),
      heap: this.snapshotHeap(),
      output: this.output,
      algorithmState: this.algorithmState(),
      ...(details.exception ? { exception: details.exception } : {}),
    });
  }

  private snapshotFrames(): FrameSnapshot[] {
    return this.callStack.map((frame) => {
      const locals: LocalSnapshot[] = [];
      frame.scopes.forEach((scope, scopeDepth) => {
        for (const [name, binding] of scope) locals.push({ name, type: binding.type, value: { ...binding.value }, scopeDepth });
      });
      return { id: frame.id, className: frame.className, methodName: frame.method.name, locals };
    });
  }

  private snapshotHeap(): HeapObjectSnapshot[] {
    const reachable = new Set<string>(this.literalRoots);
    const visit = (value: RuntimeValue) => {
      if (value.kind !== 'reference' || reachable.has(value.target)) return;
      reachable.add(value.target);
      const object = this.heap.get(value.target);
      if (!object) return;
      for (const field of object.fields.values()) visit(field.value);
      object.elements.forEach(visit);
    };
    for (const frame of this.callStack) for (const scope of frame.scopes) for (const binding of scope.values()) visit(binding.value);
    return [...this.heap.values()].map((object) => ({
      id: object.id,
      typeName: object.typeName,
      kind: object.kind,
      fields: [...object.fields.entries()].map(([name, binding]) => ({ name, type: binding.type, value: { ...binding.value } })),
      elements: object.elements.map((value) => ({ ...value })),
      ...(object.elementType ? { elementType: object.elementType } : {}),
      ...(object.text !== undefined ? { text: object.text } : {}),
      reachable: reachable.has(object.id),
    }));
  }

  private algorithmState(): Record<string, string | number | boolean | null> {
    const frame = this.callStack[this.callStack.length - 1];
    const preferred = new Set(['index', 'i', 'j', 'left', 'right', 'low', 'high', 'mid', 'start', 'end', 'current', 'target', 'key', 'sum', 'count', 'found']);
    const result: Record<string, string | number | boolean | null> = {};
    if (!frame) return result;
    for (const scope of frame.scopes) {
      for (const [name, binding] of scope) {
        if (!preferred.has(name)) continue;
        if (binding.value.kind === 'primitive') result[name] = binding.value.value;
        else if (binding.value.kind === 'null') result[name] = null;
        else if (binding.value.kind === 'reference') result[name] = `→ ${binding.value.target}`;
      }
    }
    return result;
  }

  private invoke(className: string, method: MethodDecl, args: RuntimeValue[], callLine: number): RuntimeValue | undefined {
    if (!method.isStatic) throw new JavaSubsetError('UnsupportedInstanceMethod', `Method “${method.name}” must be static in this subset.`, { line: callLine, column: 1 });
    if (args.length !== method.parameters.length) throw new JavaSubsetError('ArgumentCountMismatch', `Method “${method.name}” expects ${method.parameters.length} argument(s), received ${args.length}.`, { line: callLine, column: 1 });
    if (this.callStack.length >= this.limits.maxCallDepth) throw new JavaSubsetError('CallDepthExceeded', `Call depth exceeded ${this.limits.maxCallDepth}.`, { line: callLine, column: 1 });
    const classDecl = this.classes.get(className);
    if (!classDecl) throw new JavaSubsetError('UnknownClass', `Class “${className}” is not declared in this source.`, { line: callLine, column: 1 });
    const frame: Frame = { id: `F${this.nextFrameId++}`, className, method, scopes: [new Map()] };
    for (let index = 0; index < method.parameters.length; index += 1) {
      const parameter = method.parameters[index]!;
      frame.scopes[0]!.set(parameter.name, { type: parameter.type, value: this.coerce(args[index]!, parameter.type, callLine) });
    }
    this.callStack.push(frame);
    this.emit({ line: callLine, kind: 'call', label: `Call ${className}.${method.name}()`, why: 'A new stack frame stores this method’s parameters and local variables. Reference arguments copy the reference, not the pointed-to object.', memoryChange: `Pushed frame ${frame.id} with ${method.parameters.length} parameter(s).`, next: 'Begin executing the first statement in this method.' });
    let returned: RuntimeValue | undefined;
    let hasReturned = false;
    try {
      this.executeBlock(method.body, false);
    } catch (error) {
      if (error instanceof ReturnSignal) {
        returned = error.value;
        hasReturned = true;
      } else {
        this.callStack.pop();
        throw error;
      }
    }
    this.callStack.pop();
    if (method.returnType !== 'void') {
      if (!hasReturned || returned === undefined) throw new JavaSubsetError('MissingReturn', `Method “${method.name}” can finish without returning a ${method.returnType}.`, { line: method.line, column: 1 });
      returned = this.coerce(returned, method.returnType, callLine);
    } else if (hasReturned && returned !== undefined) {
      throw new JavaSubsetError('VoidReturnValue', `Void method “${method.name}” cannot return a value.`, { line: method.line, column: 1 });
    }
    this.emit({ line: callLine, kind: 'return', label: `Return from ${className}.${method.name}()`, why: hasReturned ? 'The method’s return value is passed back to its caller.' : 'The void method has finished; its frame is removed.', memoryChange: `Popped frame ${frame.id}${returned ? `; returned ${this.describeValue(returned)}.` : '.'}`, next: 'Execution resumes in the caller.' });
    return returned;
  }

  private executeBlock(statements: Statement[], createScope: boolean): void {
    const frame = this.callStack[this.callStack.length - 1];
    if (!frame) throw new JavaSubsetError('InternalExecutionError', 'No active method frame.');
    if (createScope) frame.scopes.push(new Map());
    try {
      for (const statement of statements) this.execute(statement);
    } finally {
      if (createScope) frame.scopes.pop();
    }
  }

  private execute(statement: Statement): StatementFlow {
    this.tick(statement.line);
    switch (statement.kind) {
      case 'empty':
        return undefined;
      case 'block':
        this.executeBlock(statement.statements, true);
        return undefined;
      case 'variable': {
        const scope = this.callStack[this.callStack.length - 1]!.scopes.at(-1)!;
        if (scope.has(statement.name)) throw new JavaSubsetError('DuplicateLocal', `Variable “${statement.name}” is already declared in this scope.`, { line: statement.line, column: 1 });
        const value = statement.initializer ? this.evaluateInitializer(statement.type, statement.initializer) : this.isJavaPrimitive(statement.type) ? UNINITIALIZED : UNINITIALIZED;
        scope.set(statement.name, { type: statement.type, value });
        this.emit({ line: statement.line, kind: 'statement', label: `Declare ${statement.type} ${statement.name}`, why: statement.initializer ? 'The initializer is evaluated, then its value is assigned to the new local.' : 'A local declaration without an initializer is unassigned; Java does not give locals a default value.', memoryChange: statement.initializer ? `${statement.name} = ${this.describeValue(value)}.` : `${statement.name} exists in this frame but is not initialized.` , commonMistake: 'Local variables do not receive the same default values as object fields and array elements.' });
        return undefined;
      }
      case 'expression': {
        this.evaluate(statement.expression);
        this.emit({ line: statement.line, kind: 'statement', label: 'Evaluate expression', why: 'The expression has completed; any assignment or method call it contains has already updated the trace.', memoryChange: 'No additional state change beyond effects inside the expression.' });
        return undefined;
      }
      case 'if': {
        const condition = this.evaluate(statement.condition);
        const result = this.expectBoolean(condition, statement.line);
        this.emit({ line: statement.line, kind: 'branch', label: `if condition is ${result}`, why: `Java evaluates the boolean condition once and follows the ${result ? 'then' : 'else'} path.`, memoryChange: 'The condition itself does not change memory unless it contains an assignment (which this subset permits).', next: result ? 'Execute the then branch.' : statement.elseBranch ? 'Execute the else branch.' : 'Continue after the if statement.' });
        this.execute(result ? statement.thenBranch : statement.elseBranch ?? { kind: 'empty', line: statement.line });
        return undefined;
      }
      case 'while': {
        let iteration = 0;
        while (true) {
          this.tick(statement.line);
          const result = this.expectBoolean(this.evaluate(statement.condition), statement.line);
          this.emit({ line: statement.line, kind: 'loop', label: `while condition is ${result}`, why: `Loop check ${iteration + 1}: the condition is evaluated before the body.`, memoryChange: 'Loop-condition evaluation has completed.', next: result ? 'Execute one loop-body iteration.' : 'Exit the loop.' });
          if (!result) break;
          this.execute(statement.body);
          iteration += 1;
        }
        return undefined;
      }
      case 'for': {
        if (statement.initializer) this.execute(statement.initializer);
        let iteration = 0;
        while (true) {
          this.tick(statement.line);
          const result = statement.condition ? this.expectBoolean(this.evaluate(statement.condition), statement.line) : true;
          this.emit({ line: statement.line, kind: 'loop', label: `for condition is ${result}`, why: `Loop check ${iteration + 1}: the condition is tested before the body.`, memoryChange: 'The loop condition was evaluated; loop variables keep their current values.', next: result ? 'Execute the body, then the update expression.' : 'Exit the loop.' });
          if (!result) break;
          this.execute(statement.body);
          if (statement.update) this.evaluate(statement.update);
          iteration += 1;
        }
        return undefined;
      }
      case 'return': {
        const value = statement.value ? this.evaluate(statement.value) : undefined;
        this.emit({ line: statement.line, kind: 'return', label: value ? `Return ${this.describeValue(value)}` : 'Return from method', why: 'The current method stops here and hands control back to its caller.', memoryChange: value ? `The return value is ${this.describeValue(value)}.` : 'No value is returned from this void method.', next: 'The caller resumes after this call.' });
        throw new ReturnSignal(value);
      }
    }
  }

  private evaluateInitializer(type: string, expression: Expr): RuntimeValue {
    if (expression.kind === 'array-initializer') {
      if (!type.endsWith('[]')) throw new JavaSubsetError('TypeMismatch', 'An array initializer can only initialize an array variable.', { line: expression.line, column: 1 });
      const elementType = type.slice(0, -2);
      const values = expression.values.map((item) => this.coerce(this.evaluate(item), elementType, item.line));
      return this.allocateArray(elementType, values, expression.line);
    }
    return this.coerce(this.evaluate(expression), type, expression.line);
  }

  private evaluate(expression: Expr): RuntimeValue {
    switch (expression.kind) {
      case 'literal': {
        if ('kind' in expression.value && expression.value.kind === 'string-literal') return this.internString(expression.value.value);
        return { ...expression.value } as RuntimeValue;
      }
      case 'identifier': return this.lookup(expression.name, expression.line).value;
      case 'new-object': return this.allocateObject(expression.className, expression.line);
      case 'new-array': {
        if (expression.values) {
          const values = expression.values.map((item) => this.coerce(this.evaluate(item), expression.elementType, item.line));
          return this.allocateArray(expression.elementType, values, expression.line);
        }
        const sizeValue = expression.size ? this.evaluate(expression.size) : { kind: 'primitive', type: 'int', value: 0 } as RuntimeValue;
        const size = this.expectInteger(sizeValue, expression.line);
        if (size < 0) throw new JavaSubsetError('NegativeArraySizeException', `Array size ${size} cannot be negative.`, { line: expression.line, column: 1 });
        if (size > this.limits.maxArrayLength) throw new JavaSubsetError('ArrayLimitExceeded', `Array length is limited to ${this.limits.maxArrayLength}.`, { line: expression.line, column: 1 });
        return this.allocateArray(expression.elementType, Array.from({ length: size }, () => this.defaultValue(expression.elementType)), expression.line);
      }
      case 'array-initializer': throw new JavaSubsetError('SyntaxError', 'Array initializer needs a declared array type.', { line: expression.line, column: 1 });
      case 'member': return this.readMember(expression.object, expression.name, expression.line);
      case 'index': {
        const { object, index } = this.getArrayAndIndex(expression.object, expression.index, expression.line);
        const value = object.elements[index];
        if (!value) throw new JavaSubsetError('InternalExecutionError', 'Array slot was missing.', { line: expression.line, column: 1 });
        return value;
      }
      case 'call': return this.evaluateCall(expression);
      case 'binary': return this.evaluateBinary(expression);
      case 'unary': return this.evaluateUnary(expression);
      case 'assignment': return this.evaluateAssignment(expression);
      case 'postfix': return this.evaluatePostfix(expression);
    }
  }

  private evaluateCall(expression: Extract<Expr, { kind: 'call' }>): RuntimeValue {
    const isPrintln = expression.callee.kind === 'member' && expression.callee.name === 'println' && this.isSystemOut(expression.callee.object);
    const isPrint = expression.callee.kind === 'member' && expression.callee.name === 'print' && this.isSystemOut(expression.callee.object);
    if (isPrintln || isPrint) {
      const expectedCount = isPrintln ? [0, 1] : [1];
      if (!expectedCount.includes(expression.args.length)) {
        throw new JavaSubsetError('UnsupportedOverload', isPrintln ? 'System.out.println supports zero or one argument in this subset.' : 'System.out.print supports exactly one argument in this subset.', { line: expression.line, column: 1 });
      }
      const args = expression.args.map((argument) => this.evaluate(argument));
      const text = args.length === 0 ? '' : this.toConsoleText(args[0]!, expression.line);
      if (isPrintln) {
        this.output += `${text}\n`;
        this.emit({ line: expression.line, kind: 'output', label: `println(${args.length ? this.describeValue(args[0]!) : ''})`, why: 'System.out.println writes the argument followed by a line break to the program console.', memoryChange: 'Console output changed; Java local variables and heap objects are unchanged.', next: 'Continue with the next statement.' });
      } else {
        this.output += text;
        this.emit({ line: expression.line, kind: 'output', label: `print(${this.describeValue(args[0]!)})`, why: 'System.out.print writes the argument without adding a line break.', memoryChange: 'Console output changed; Java local variables and heap objects are unchanged.' });
      }
      return { kind: 'void' };
    }

    let className: string;
    let methodName: string;
    if (expression.callee.kind === 'identifier') {
      className = this.callStack.at(-1)?.className ?? '';
      methodName = expression.callee.name;
    } else if (expression.callee.kind === 'member' && expression.callee.object.kind === 'identifier') {
      className = expression.callee.object.name;
      methodName = expression.callee.name;
    } else {
      throw new JavaSubsetError('UnsupportedMethodCall', 'Only static methods declared in this source and System.out.print/println are supported.', { line: expression.line, column: 1 });
    }
    const method = this.methods.get(`${className}.${methodName}`);
    if (!method) throw new JavaSubsetError('UnknownMethod', `Static method “${className}.${methodName}” is not declared.`, { line: expression.line, column: 1 });
    if (expression.args.length !== method.parameters.length) throw new JavaSubsetError('ArgumentCountMismatch', `Method “${method.name}” expects ${method.parameters.length} argument(s), received ${expression.args.length}.`, { line: expression.line, column: 1 });
    const args = expression.args.map((argument) => this.evaluate(argument));
    const result = this.invoke(className, method, args, expression.line);
    return result ?? { kind: 'void' };
  }

  private isSystemOut(expression: Expr): boolean {
    return expression.kind === 'member' && expression.name === 'out' && expression.object.kind === 'identifier' && expression.object.name === 'System';
  }

  private evaluateBinary(expression: Extract<Expr, { kind: 'binary' }>): RuntimeValue {
    const left = this.evaluate(expression.left);
    if (expression.operator === '&&') {
      const leftBoolean = this.expectBoolean(left, expression.line);
      if (!leftBoolean) return { kind: 'primitive', type: 'boolean', value: false };
      return { kind: 'primitive', type: 'boolean', value: this.expectBoolean(this.evaluate(expression.right), expression.line) };
    }
    if (expression.operator === '||') {
      const leftBoolean = this.expectBoolean(left, expression.line);
      if (leftBoolean) return { kind: 'primitive', type: 'boolean', value: true };
      return { kind: 'primitive', type: 'boolean', value: this.expectBoolean(this.evaluate(expression.right), expression.line) };
    }
    const right = this.evaluate(expression.right);
    const operator = expression.operator;
    if (operator === '==' || operator === '!=') {
      const equal = this.areEqual(left, right, expression.line);
      return { kind: 'primitive', type: 'boolean', value: operator === '==' ? equal : !equal };
    }
    if (operator === '+' && (this.isString(left) || this.isString(right))) {
      const text = this.toStringValue(left, expression.line) + this.toStringValue(right, expression.line);
      return this.allocateString(text, false, expression.line);
    }
    if (['<', '<=', '>', '>='].includes(operator)) {
      const a = this.expectNumber(left, expression.line);
      const b = this.expectNumber(right, expression.line);
      const result = operator === '<' ? a < b : operator === '<=' ? a <= b : operator === '>' ? a > b : a >= b;
      return { kind: 'primitive', type: 'boolean', value: result };
    }
    if (numericOperators.has(operator)) return this.numericOperation(left, right, operator, expression.line);
    throw new JavaSubsetError('UnsupportedOperator', `Operator “${operator}” is not supported.`, { line: expression.line, column: 1 });
  }

  private evaluateUnary(expression: Extract<Expr, { kind: 'unary' }>): RuntimeValue {
    if (expression.operator === '!') return { kind: 'primitive', type: 'boolean', value: !this.expectBoolean(this.evaluate(expression.operand), expression.line) };
    if (expression.operator === '+' || expression.operator === '-') {
      const value = this.evaluate(expression.operand);
      if (!isNumeric(value)) throw new JavaSubsetError('TypeMismatch', `Unary ${expression.operator} expects a numeric value.`, { line: expression.line, column: 1 });
      const number = expression.operator === '-' ? -Number(value.value) : Number(value.value);
      return this.numericValue(number, value.type, expression.line);
    }
    if (expression.operator === '++' || expression.operator === '--') {
      const target = this.resolveLValue(expression.operand, expression.line);
      const previous = target.get();
      if (!isNumeric(previous)) throw new JavaSubsetError('TypeMismatch', 'Increment and decrement require a numeric variable.', { line: expression.line, column: 1 });
      const value = this.numericValue(Number(previous.value) + (expression.operator === '++' ? 1 : -1), previous.type, expression.line);
      target.set(value);
      this.emit({ line: expression.line, kind: 'mutation', label: `${target.description} ${expression.operator}`, why: 'Prefix increment or decrement updates the variable before its value is used.', memoryChange: `${target.description} changed from ${this.describeValue(previous)} to ${this.describeValue(value)}.` });
      return value;
    }
    throw new JavaSubsetError('UnsupportedOperator', `Unary operator “${expression.operator}” is not supported.`, { line: expression.line, column: 1 });
  }

  private evaluateAssignment(expression: Extract<Expr, { kind: 'assignment' }>): RuntimeValue {
    const target = this.resolveLValue(expression.target, expression.line);
    const oldValue = target.get();
    const right = this.evaluate(expression.value);
    let assigned = right;
    if (expression.operator !== '=') {
      const operator = expression.operator[0]!;
      if (operator === '+' && (this.isString(oldValue) || this.isString(right))) {
        assigned = this.allocateString(this.toStringValue(oldValue, expression.line) + this.toStringValue(right, expression.line), false, expression.line);
      } else {
        assigned = this.numericOperation(oldValue, right, operator, expression.line);
      }
    }
    assigned = this.coerce(assigned, target.type, expression.line);
    target.set(assigned);
    this.emit({ line: expression.line, kind: 'mutation', label: `${target.description} = ${this.describeValue(assigned)}`, why: 'The right-hand side is evaluated and then stored in the assignment target.', memoryChange: `${target.description} changed from ${this.describeValue(oldValue)} to ${this.describeValue(assigned)}.`, commonMistake: assigned.kind === 'reference' ? 'A reference assignment copies the arrow/reference; it does not clone the object.' : 'Assignment changes the target variable; other variables keep their values.' });
    return assigned;
  }

  private evaluatePostfix(expression: Extract<Expr, { kind: 'postfix' }>): RuntimeValue {
    const target = this.resolveLValue(expression.target, expression.line);
    const previous = target.get();
    if (!isNumeric(previous)) throw new JavaSubsetError('TypeMismatch', 'Increment and decrement require a numeric variable.', { line: expression.line, column: 1 });
    const updated = this.numericValue(Number(previous.value) + (expression.operator === '++' ? 1 : -1), previous.type, expression.line);
    target.set(updated);
    this.emit({ line: expression.line, kind: 'mutation', label: `${target.description} ${expression.operator}`, why: 'Postfix increment or decrement stores the updated value but evaluates to the old value.', memoryChange: `${target.description} changed from ${this.describeValue(previous)} to ${this.describeValue(updated)}.` });
    return previous;
  }

  private resolveLValue(expression: Expr, line: number): LValue {
    if (expression.kind === 'identifier') {
      const binding = this.lookup(expression.name, line);
      return { type: binding.type, get: () => binding.value, set: (value) => { binding.value = value; }, description: expression.name };
    }
    if (expression.kind === 'member') {
      const receiver = this.evaluate(expression.object);
      const object = this.requireHeapObject(receiver, line);
      const field = object.fields.get(expression.name);
      if (!field) throw new JavaSubsetError('UnknownField', `Field “${expression.name}” is not declared on ${object.typeName}.`, { line, column: 1 });
      return { type: field.type, get: () => field.value, set: (value) => { field.value = value; }, description: `${object.id}.${expression.name}` };
    }
    if (expression.kind === 'index') {
      const { object, index } = this.getArrayAndIndex(expression.object, expression.index, line);
      return {
        type: object.elementType ?? 'Object',
        get: () => object.elements[index] ?? NULL,
        set: (value) => { object.elements[index] = value; },
        description: `${object.id}[${index}]`,
      };
    }
    throw new JavaSubsetError('InvalidAssignmentTarget', 'Assignment target must be a variable, field, or array element.', { line, column: 1 });
  }

  private readMember(receiverExpression: Expr, name: string, line: number): RuntimeValue {
    const receiver = this.evaluate(receiverExpression);
    const object = this.requireHeapObject(receiver, line);
    if (object.kind === 'array' && name === 'length') return { kind: 'primitive', type: 'int', value: object.elements.length };
    const field = object.fields.get(name);
    if (!field) throw new JavaSubsetError('UnknownField', `Field “${name}” is not declared on ${object.typeName}.`, { line, column: 1 });
    return field.value;
  }

  private getArrayAndIndex(arrayExpression: Expr, indexExpression: Expr, line: number): { object: InternalHeapObject; index: number } {
    const reference = this.evaluate(arrayExpression);
    const object = this.requireHeapObject(reference, line);
    if (object.kind !== 'array') throw new JavaSubsetError('NotAnArray', `Cannot use an index on ${object.typeName}.`, { line, column: 1 });
    const index = this.expectInteger(this.evaluate(indexExpression), line);
    if (index < 0 || index >= object.elements.length) throw new JavaSubsetError('ArrayIndexOutOfBoundsException', `Index ${index} is outside [0, ${object.elements.length - 1}].`, { line, column: 1 });
    return { object, index };
  }

  private allocateObject(className: string, line: number): RuntimeValue {
    const declaration = this.classes.get(className);
    if (!declaration) throw new JavaSubsetError('UnknownClass', `Class “${className}” is not declared in this source.`, { line, column: 1 });
    this.checkHeapLimit(line);
    const id = `O${this.nextObjectId++}`;
    const fields = new Map<string, InternalBinding>();
    for (const field of declaration.fields) fields.set(field.name, { type: field.type, value: this.defaultValue(field.type) });
    this.heap.set(id, { id, typeName: className, kind: 'object', fields, elements: [] });
    this.emit({ line, kind: 'allocation', label: `Allocate ${className} as ${id}`, why: 'A new object is placed in the conceptual heap. Its declared fields receive Java default values.', memoryChange: `${id} created with ${fields.size} field(s). The local variable receives its reference when the declaration finishes.`, next: 'Assign this reference or follow its fields.' });
    return { kind: 'reference', target: id };
  }

  private allocateArray(elementType: string, values: RuntimeValue[], line: number): RuntimeValue {
    if (values.length > this.limits.maxArrayLength) throw new JavaSubsetError('ArrayLimitExceeded', `Array length is limited to ${this.limits.maxArrayLength}.`, { line, column: 1 });
    this.checkHeapLimit(line);
    const id = `O${this.nextObjectId++}`;
    this.heap.set(id, { id, typeName: `${elementType}[]`, kind: 'array', fields: new Map(), elements: values, elementType });
    this.emit({ line, kind: 'allocation', label: `Allocate ${elementType}[${values.length}] as ${id}`, why: 'Java arrays are objects. Their elements are initialized or receive the element type’s default value.', memoryChange: `${id} contains ${values.length} element(s); the variable stores a reference to this array.`, next: 'Inspect array slots or follow the next statement.' });
    return { kind: 'reference', target: id };
  }

  private allocateString(text: string, intern: boolean, line: number): RuntimeValue {
    if (intern && this.literalPool.has(text)) return { kind: 'reference', target: this.literalPool.get(text)! };
    this.checkHeapLimit(line);
    const id = `O${this.nextObjectId++}`;
    this.heap.set(id, { id, typeName: 'String', kind: 'string', fields: new Map(), elements: [], text });
    if (intern) {
      this.literalPool.set(text, id);
      this.literalRoots.add(id);
    }
    this.emit({ line, kind: 'allocation', label: `Create String ${id}`, why: intern ? 'A string literal is represented as a conceptual String reference; repeated identical literals reuse this pedagogical intern-pool entry.' : 'String concatenation creates a new immutable String value in this model.', memoryChange: `${id} stores ${JSON.stringify(text)}.`, next: 'The String variable or expression contains a reference to this object.', commonMistake: 'String identity and pool details are simplified; this diagram is not a physical JVM heap.' });
    return { kind: 'reference', target: id };
  }

  private internString(text: string): RuntimeValue { return this.allocateString(text, true, this.currentLine); }

  private checkHeapLimit(line: number): void {
    if (this.heap.size >= this.limits.maxHeapObjects) throw new JavaSubsetError('HeapLimitExceeded', `Heap visualization is limited to ${this.limits.maxHeapObjects} objects.`, { line, column: 1 });
  }

  private defaultValue(type: string): RuntimeValue {
    if (isReferenceType(type)) return NULL;
    if (type === 'boolean') return { kind: 'primitive', type: 'boolean', value: false };
    if (type === 'char') return { kind: 'primitive', type: 'char', value: '\u0000' };
    if (type === 'double' || type === 'float') return { kind: 'primitive', type: type as PrimitiveType, value: 0 };
    return { kind: 'primitive', type: type as PrimitiveType, value: 0 };
  }

  private isJavaPrimitive(type: string): boolean { return isPrimitiveType(type); }

  private coerce(value: RuntimeValue, type: string, line: number): RuntimeValue {
    if (value.kind === 'void') throw new JavaSubsetError('TypeMismatch', 'A void method call does not produce a value.', { line, column: 1 });
    if (value.kind === 'uninitialized') throw new JavaSubsetError('UninitializedVariable', 'A local variable is read before it has been assigned.', { line, column: 1 });
    if (type === 'void') throw new JavaSubsetError('TypeMismatch', 'void is not a value type.', { line, column: 1 });
    if (isPrimitiveType(type)) {
      if (value.kind !== 'primitive') throw new JavaSubsetError('TypeMismatch', `Cannot assign ${valueType(value)} to ${type}.`, { line, column: 1 });
      if (type === 'boolean') {
        if (value.type !== 'boolean') throw new JavaSubsetError('TypeMismatch', `Cannot assign ${value.type} to boolean.`, { line, column: 1 });
        return value;
      }
      if (type === 'char') {
        if (value.type !== 'char') throw new JavaSubsetError('TypeMismatch', `Cannot assign ${value.type} to char without a cast; casts are not supported.`, { line, column: 1 });
        return value;
      }
      if (!numericTypes.includes(value.type)) throw new JavaSubsetError('TypeMismatch', `Cannot assign ${value.type} to ${type}.`, { line, column: 1 });
      const rank: Record<string, number> = { int: 1, long: 2, float: 3, double: 4 };
      if ((rank[value.type] ?? 0) > (rank[type] ?? 0)) throw new JavaSubsetError('TypeMismatch', `Narrowing ${value.type} to ${type} requires a cast; casts are outside this subset.`, { line, column: 1 });
      if (type === 'int' && !Number.isInteger(value.value)) throw new JavaSubsetError('TypeMismatch', 'An int assignment requires a whole number.', { line, column: 1 });
      if (type === 'int' && (Number(value.value) < -2_147_483_648 || Number(value.value) > 2_147_483_647)) throw new JavaSubsetError('IntegerOverflow', 'The value is outside the Java int range.', { line, column: 1 });
      return { kind: 'primitive', type, value: Number(value.value) };
    }
    if (value.kind === 'null') {
      if (!isReferenceType(type)) throw new JavaSubsetError('TypeMismatch', `null cannot be assigned to ${type}.`, { line, column: 1 });
      return NULL;
    }
    if (value.kind !== 'reference') throw new JavaSubsetError('TypeMismatch', `Cannot assign ${valueType(value)} to ${type}.`, { line, column: 1 });
    const object = this.heap.get(value.target);
    if (!object) throw new JavaSubsetError('DanglingReference', `Object ${value.target} does not exist in this trace.`, { line, column: 1 });
    const compatible = type.endsWith('[]') ? object.kind === 'array' && object.typeName === type : type === 'String' ? object.kind === 'string' : object.kind === 'object' && object.typeName === type;
    if (!compatible) throw new JavaSubsetError('TypeMismatch', `Cannot assign ${object.typeName} to ${type}.`, { line, column: 1 });
    return value;
  }

  private lookup(name: string, line: number): InternalBinding {
    const frame = this.callStack.at(-1);
    if (!frame) throw new JavaSubsetError('UnknownVariable', `Variable “${name}” is not available.`, { line, column: 1 });
    for (let index = frame.scopes.length - 1; index >= 0; index -= 1) {
      const binding = frame.scopes[index]!.get(name);
      if (binding) {
        if (binding.value.kind === 'uninitialized') throw new JavaSubsetError('UninitializedVariable', `Local “${name}” is read before it is assigned.`, { line, column: 1 });
        return binding;
      }
    }
    throw new JavaSubsetError('UnknownVariable', `Variable “${name}” is not declared in the current method.`, { line, column: 1 });
  }

  private requireHeapObject(value: RuntimeValue, line: number): InternalHeapObject {
    if (value.kind === 'null') throw new JavaSubsetError('NullPointerException', 'Cannot read a field or element through null.', { line, column: 1 });
    if (value.kind !== 'reference') throw new JavaSubsetError('TypeMismatch', 'Field or index access requires a reference.', { line, column: 1 });
    const object = this.heap.get(value.target);
    if (!object) throw new JavaSubsetError('DanglingReference', `Object ${value.target} does not exist.`, { line, column: 1 });
    return object;
  }

  private expectBoolean(value: RuntimeValue, line: number): boolean {
    if (value.kind !== 'primitive' || value.type !== 'boolean') throw new JavaSubsetError('TypeMismatch', 'A boolean condition is required.', { line, column: 1 });
    return value.value as boolean;
  }

  private expectNumber(value: RuntimeValue, line: number): number {
    if (!isNumeric(value)) throw new JavaSubsetError('TypeMismatch', 'A numeric value is required.', { line, column: 1 });
    return Number(value.value);
  }

  private expectInteger(value: RuntimeValue, line: number): number {
    const number = this.expectNumber(value, line);
    if (!Number.isInteger(number)) throw new JavaSubsetError('TypeMismatch', 'An integer value is required for an array size or index.', { line, column: 1 });
    return number;
  }

  private numericOperation(left: RuntimeValue, right: RuntimeValue, operator: string, line: number): RuntimeValue {
    if (!isNumeric(left) || !isNumeric(right)) throw new JavaSubsetError('TypeMismatch', `Operator “${operator}” requires numeric operands.`, { line, column: 1 });
    const resultType = (['double', 'float', 'long', 'int'] as PrimitiveType[]).find((type) => left.type === type || right.type === type) ?? 'int';
    const a = Number(left.value);
    const b = Number(right.value);
    if ((operator === '/' || operator === '%') && b === 0) throw new JavaSubsetError('ArithmeticException', 'Division by zero.', { line, column: 1 });
    let result: number;
    switch (operator) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = resultType === 'int' || resultType === 'long' ? Math.trunc(a / b) : a / b; break;
      case '%': result = a % b; break;
      default: throw new JavaSubsetError('UnsupportedOperator', `Numeric operator “${operator}” is not supported.`, { line, column: 1 });
    }
    return this.numericValue(result, resultType, line);
  }

  private numericValue(value: number, type: PrimitiveType, line: number): RuntimeValue {
    if (type === 'int') return { kind: 'primitive', type, value: value | 0 };
    if (type === 'long') {
      if (!Number.isSafeInteger(Math.trunc(value))) throw new JavaSubsetError('LongPrecisionLimit', 'This visualizer limits long arithmetic to JavaScript-safe integer precision.', { line, column: 1 });
      return { kind: 'primitive', type, value: Math.trunc(value) };
    }
    return { kind: 'primitive', type, value: type === 'float' ? Math.fround(value) : value };
  }

  private areEqual(left: RuntimeValue, right: RuntimeValue, line: number): boolean {
    if (left.kind === 'void' || right.kind === 'void') throw new JavaSubsetError('TypeMismatch', 'A void method call cannot be compared.', { line, column: 1 });
    if (left.kind === 'uninitialized' || right.kind === 'uninitialized') throw new JavaSubsetError('UninitializedVariable', 'An uninitialized local cannot be compared.', { line, column: 1 });
    if (left.kind === 'null' || right.kind === 'null') return left.kind === right.kind;
    if (left.kind === 'reference' || right.kind === 'reference') return left.kind === 'reference' && right.kind === 'reference' && left.target === right.target;
    return left.type === right.type && left.value === right.value;
  }

  private isString(value: RuntimeValue): boolean {
    return value.kind === 'reference' && this.heap.get(value.target)?.kind === 'string';
  }

  private toStringValue(value: RuntimeValue, line: number): string {
    if (value.kind === 'void') throw new JavaSubsetError('TypeMismatch', 'A void method call cannot be converted to text.', { line, column: 1 });
    if (value.kind === 'primitive') return value.type === 'char' ? String(value.value) : String(value.value);
    if (value.kind === 'null') return 'null';
    if (value.kind === 'uninitialized') throw new JavaSubsetError('UninitializedVariable', 'An uninitialized value cannot be converted to text.', { line, column: 1 });
    const object = this.heap.get(value.target);
    if (object?.kind === 'string') return object.text ?? '';
    throw new JavaSubsetError('UnsupportedObjectString', 'Printing or concatenating a user object or array is unsupported; print a primitive or String value.', { line, column: 1 });
  }

  private toConsoleText(value: RuntimeValue, line: number): string { return this.toStringValue(value, line); }

  private describeValue(value: RuntimeValue): string {
    if (value.kind === 'null') return 'null';
    if (value.kind === 'void') return 'void';
    if (value.kind === 'uninitialized') return 'uninitialized';
    if (value.kind === 'reference') return `→ ${value.target}`;
    if (value.type === 'char') return `'${value.value === '\u0000' ? '\\0' : value.value}'`;
    return String(value.value);
  }

  private toExecutionError(error: unknown): ExecutionError {
    if (error instanceof JavaSubsetError) {
      return { type: error.type, message: error.message, ...(error.line ? { line: error.line } : {}), ...(error.column ? { column: error.column } : {}) };
    }
    if (error instanceof Error) return { type: 'ExecutionError', message: error.message || 'Unexpected interpreter error.' };
    return { type: 'ExecutionError', message: 'Unexpected interpreter error.' };
  }
}

export function executeJavaSubset(source: string, limits: Partial<ExecutionLimits> = {}): TraceResult {
  return new Interpreter(limits).run(source);
}
