#!/usr/bin/env node
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// node_modules/ajv/dist/compile/codegen/code.js
var require_code = __commonJS({
  "node_modules/ajv/dist/compile/codegen/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
    var _CodeOrName = class {
    };
    exports._CodeOrName = _CodeOrName;
    exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
    var Name = class extends _CodeOrName {
      constructor(s) {
        super();
        if (!exports.IDENTIFIER.test(s))
          throw new Error("CodeGen: name must be a valid identifier");
        this.str = s;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return false;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    exports.Name = Name;
    var _Code = class extends _CodeOrName {
      constructor(code) {
        super();
        this._items = typeof code === "string" ? [code] : code;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1)
          return false;
        const item = this._items[0];
        return item === "" || item === '""';
      }
      get str() {
        var _a;
        return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
      }
      get names() {
        var _a;
        return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c) => {
          if (c instanceof Name)
            names[c.str] = (names[c.str] || 0) + 1;
          return names;
        }, {});
      }
    };
    exports._Code = _Code;
    exports.nil = new _Code("");
    function _(strs, ...args) {
      const code = [strs[0]];
      let i = 0;
      while (i < args.length) {
        addCodeArg(code, args[i]);
        code.push(strs[++i]);
      }
      return new _Code(code);
    }
    exports._ = _;
    var plus = new _Code("+");
    function str(strs, ...args) {
      const expr = [safeStringify(strs[0])];
      let i = 0;
      while (i < args.length) {
        expr.push(plus);
        addCodeArg(expr, args[i]);
        expr.push(plus, safeStringify(strs[++i]));
      }
      optimize(expr);
      return new _Code(expr);
    }
    exports.str = str;
    function addCodeArg(code, arg) {
      if (arg instanceof _Code)
        code.push(...arg._items);
      else if (arg instanceof Name)
        code.push(arg);
      else
        code.push(interpolate(arg));
    }
    exports.addCodeArg = addCodeArg;
    function optimize(expr) {
      let i = 1;
      while (i < expr.length - 1) {
        if (expr[i] === plus) {
          const res = mergeExprItems(expr[i - 1], expr[i + 1]);
          if (res !== void 0) {
            expr.splice(i - 1, 3, res);
            continue;
          }
          expr[i++] = "+";
        }
        i++;
      }
    }
    function mergeExprItems(a, b) {
      if (b === '""')
        return a;
      if (a === '""')
        return b;
      if (typeof a == "string") {
        if (b instanceof Name || a[a.length - 1] !== '"')
          return;
        if (typeof b != "string")
          return `${a.slice(0, -1)}${b}"`;
        if (b[0] === '"')
          return a.slice(0, -1) + b.slice(1);
        return;
      }
      if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
        return `"${a}${b.slice(1)}`;
      return;
    }
    function strConcat(c1, c2) {
      return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
    }
    exports.strConcat = strConcat;
    function interpolate(x) {
      return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
    }
    function stringify(x) {
      return new _Code(safeStringify(x));
    }
    exports.stringify = stringify;
    function safeStringify(x) {
      return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    exports.safeStringify = safeStringify;
    function getProperty(key) {
      return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
    }
    exports.getProperty = getProperty;
    function getEsmExportName(key) {
      if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
        return new _Code(`${key}`);
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
    }
    exports.getEsmExportName = getEsmExportName;
    function regexpCode(rx) {
      return new _Code(rx.toString());
    }
    exports.regexpCode = regexpCode;
  }
});

// node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = __commonJS({
  "node_modules/ajv/dist/compile/codegen/scope.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
    var code_1 = require_code();
    var ValueError = class extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`);
        this.value = name.value;
      }
    };
    var UsedValueState;
    (function(UsedValueState2) {
      UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
      UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
    })(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
    exports.varKinds = {
      const: new code_1.Name("const"),
      let: new code_1.Name("let"),
      var: new code_1.Name("var")
    };
    var Scope = class {
      constructor({ prefixes, parent } = {}) {
        this._names = {};
        this._prefixes = prefixes;
        this._parent = parent;
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
      }
      name(prefix) {
        return new code_1.Name(this._newName(prefix));
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix);
        return `${prefix}${ng.index++}`;
      }
      _nameGroup(prefix) {
        var _a, _b;
        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
        }
        return this._names[prefix] = { prefix, index: 0 };
      }
    };
    exports.Scope = Scope;
    var ValueScopeName = class extends code_1.Name {
      constructor(prefix, nameStr) {
        super(nameStr);
        this.prefix = prefix;
      }
      setValue(value, { property, itemIndex }) {
        this.value = value;
        this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
      }
    };
    exports.ValueScopeName = ValueScopeName;
    var line = (0, code_1._)`\n`;
    var ValueScope = class extends Scope {
      constructor(opts) {
        super(opts);
        this._values = {};
        this._scope = opts.scope;
        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
      }
      get() {
        return this._scope;
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix));
      }
      value(nameOrPrefix, value) {
        var _a;
        if (value.ref === void 0)
          throw new Error("CodeGen: ref must be passed in value");
        const name = this.toName(nameOrPrefix);
        const { prefix } = name;
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
        let vs = this._values[prefix];
        if (vs) {
          const _name = vs.get(valueKey);
          if (_name)
            return _name;
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map();
        }
        vs.set(valueKey, name);
        const s = this._scope[prefix] || (this._scope[prefix] = []);
        const itemIndex = s.length;
        s[itemIndex] = value.ref;
        name.setValue(value, { property: prefix, itemIndex });
        return name;
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix];
        if (!vs)
          return;
        return vs.get(keyOrRef);
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return (0, code_1._)`${scopeName}${name.scopePath}`;
        });
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(values, (name) => {
          if (name.value === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        }, usedValues, getCode);
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code = code_1.nil;
        for (const prefix in values) {
          const vs = values[prefix];
          if (!vs)
            continue;
          const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
          vs.forEach((name) => {
            if (nameSet.has(name))
              return;
            nameSet.set(name, UsedValueState.Started);
            let c = valueCode(name);
            if (c) {
              const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
              code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
            } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
              code = (0, code_1._)`${code}${c}${this.opts._n}`;
            } else {
              throw new ValueError(name);
            }
            nameSet.set(name, UsedValueState.Completed);
          });
        }
        return code;
      }
    };
    exports.ValueScope = ValueScope;
  }
});

// node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = __commonJS({
  "node_modules/ajv/dist/compile/codegen/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
    var code_1 = require_code();
    var scope_1 = require_scope();
    var code_2 = require_code();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return code_2._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return code_2.str;
    } });
    Object.defineProperty(exports, "strConcat", { enumerable: true, get: function() {
      return code_2.strConcat;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return code_2.nil;
    } });
    Object.defineProperty(exports, "getProperty", { enumerable: true, get: function() {
      return code_2.getProperty;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return code_2.stringify;
    } });
    Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function() {
      return code_2.regexpCode;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return code_2.Name;
    } });
    var scope_2 = require_scope();
    Object.defineProperty(exports, "Scope", { enumerable: true, get: function() {
      return scope_2.Scope;
    } });
    Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function() {
      return scope_2.ValueScope;
    } });
    Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function() {
      return scope_2.ValueScopeName;
    } });
    Object.defineProperty(exports, "varKinds", { enumerable: true, get: function() {
      return scope_2.varKinds;
    } });
    exports.operators = {
      GT: new code_1._Code(">"),
      GTE: new code_1._Code(">="),
      LT: new code_1._Code("<"),
      LTE: new code_1._Code("<="),
      EQ: new code_1._Code("==="),
      NEQ: new code_1._Code("!=="),
      NOT: new code_1._Code("!"),
      OR: new code_1._Code("||"),
      AND: new code_1._Code("&&"),
      ADD: new code_1._Code("+")
    };
    var Node = class {
      optimizeNodes() {
        return this;
      }
      optimizeNames(_names, _constants) {
        return this;
      }
    };
    var Def = class extends Node {
      constructor(varKind, name, rhs) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.rhs = rhs;
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
        const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
        return `${varKind} ${this.name}${rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (!names[this.name.str])
          return;
        if (this.rhs)
          this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
      }
    };
    var Assign = class extends Node {
      constructor(lhs, rhs, sideEffects) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
        this.sideEffects = sideEffects;
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
          return;
        this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
        return addExprNames(names, this.rhs);
      }
    };
    var AssignOp = class extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects);
        this.op = op;
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
      }
    };
    var Label = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        return `${this.label}:` + _n;
      }
    };
    var Break = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        const label = this.label ? ` ${this.label}` : "";
        return `break${label};` + _n;
      }
    };
    var Throw = class extends Node {
      constructor(error) {
        super();
        this.error = error;
      }
      render({ _n }) {
        return `throw ${this.error};` + _n;
      }
      get names() {
        return this.error.names;
      }
    };
    var AnyCode = class extends Node {
      constructor(code) {
        super();
        this.code = code;
      }
      render({ _n }) {
        return `${this.code};` + _n;
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0;
      }
      optimizeNames(names, constants) {
        this.code = optimizeExpr(this.code, names, constants);
        return this;
      }
      get names() {
        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
      }
    };
    var ParentNode = class extends Node {
      constructor(nodes = []) {
        super();
        this.nodes = nodes;
      }
      render(opts) {
        return this.nodes.reduce((code, n) => code + n.render(opts), "");
      }
      optimizeNodes() {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i].optimizeNodes();
          if (Array.isArray(n))
            nodes.splice(i, 1, ...n);
          else if (n)
            nodes[i] = n;
          else
            nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      optimizeNames(names, constants) {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i];
          if (n.optimizeNames(names, constants))
            continue;
          subtractNames(names, n.names);
          nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      get names() {
        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
      }
    };
    var BlockNode = class extends ParentNode {
      render(opts) {
        return "{" + opts._n + super.render(opts) + "}" + opts._n;
      }
    };
    var Root = class extends ParentNode {
    };
    var Else = class extends BlockNode {
    };
    Else.kind = "else";
    var If = class _If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes);
        this.condition = condition;
      }
      render(opts) {
        let code = `if(${this.condition})` + super.render(opts);
        if (this.else)
          code += "else " + this.else.render(opts);
        return code;
      }
      optimizeNodes() {
        super.optimizeNodes();
        const cond = this.condition;
        if (cond === true)
          return this.nodes;
        let e = this.else;
        if (e) {
          const ns = e.optimizeNodes();
          e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
        }
        if (e) {
          if (cond === false)
            return e instanceof _If ? e : e.nodes;
          if (this.nodes.length)
            return this;
          return new _If(not(cond), e instanceof _If ? [e] : e.nodes);
        }
        if (cond === false || !this.nodes.length)
          return void 0;
        return this;
      }
      optimizeNames(names, constants) {
        var _a;
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        if (!(super.optimizeNames(names, constants) || this.else))
          return;
        this.condition = optimizeExpr(this.condition, names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        addExprNames(names, this.condition);
        if (this.else)
          addNames(names, this.else.names);
        return names;
      }
    };
    If.kind = "if";
    var For = class extends BlockNode {
    };
    For.kind = "for";
    var ForLoop = class extends For {
      constructor(iteration) {
        super();
        this.iteration = iteration;
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iteration = optimizeExpr(this.iteration, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iteration.names);
      }
    };
    var ForRange = class extends For {
      constructor(varKind, name, from, to) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.from = from;
        this.to = to;
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
        const { name, from, to } = this;
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
      }
      get names() {
        const names = addExprNames(super.names, this.from);
        return addExprNames(names, this.to);
      }
    };
    var ForIter = class extends For {
      constructor(loop, varKind, name, iterable) {
        super();
        this.loop = loop;
        this.varKind = varKind;
        this.name = name;
        this.iterable = iterable;
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iterable = optimizeExpr(this.iterable, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iterable.names);
      }
    };
    var Func = class extends BlockNode {
      constructor(name, args, async) {
        super();
        this.name = name;
        this.args = args;
        this.async = async;
      }
      render(opts) {
        const _async = this.async ? "async " : "";
        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
      }
    };
    Func.kind = "func";
    var Return = class extends ParentNode {
      render(opts) {
        return "return " + super.render(opts);
      }
    };
    Return.kind = "return";
    var Try = class extends BlockNode {
      render(opts) {
        let code = "try" + super.render(opts);
        if (this.catch)
          code += this.catch.render(opts);
        if (this.finally)
          code += this.finally.render(opts);
        return code;
      }
      optimizeNodes() {
        var _a, _b;
        super.optimizeNodes();
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
        return this;
      }
      optimizeNames(names, constants) {
        var _a, _b;
        super.optimizeNames(names, constants);
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        if (this.catch)
          addNames(names, this.catch.names);
        if (this.finally)
          addNames(names, this.finally.names);
        return names;
      }
    };
    var Catch = class extends BlockNode {
      constructor(error) {
        super();
        this.error = error;
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts);
      }
    };
    Catch.kind = "catch";
    var Finally = class extends BlockNode {
      render(opts) {
        return "finally" + super.render(opts);
      }
    };
    Finally.kind = "finally";
    var CodeGen = class {
      constructor(extScope, opts = {}) {
        this._values = {};
        this._blockStarts = [];
        this._constants = {};
        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
        this._extScope = extScope;
        this._scope = new scope_1.Scope({ parent: extScope });
        this._nodes = [new Root()];
      }
      toString() {
        return this._root.render(this.opts);
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix);
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix);
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value);
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
        vs.add(name);
        return name;
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef);
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(varKind, nameOrPrefix, rhs, constant) {
        const name = this._scope.toName(nameOrPrefix);
        if (rhs !== void 0 && constant)
          this._constants[name.str] = rhs;
        this._leafNode(new Def(varKind, name, rhs));
        return name;
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects));
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
      }
      // appends passed SafeExpr to code or executes Block
      code(c) {
        if (typeof c == "function")
          c();
        else if (c !== code_1.nil)
          this._leafNode(new AnyCode(c));
        return this;
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code = ["{"];
        for (const [key, value] of keyValues) {
          if (code.length > 1)
            code.push(",");
          code.push(key);
          if (key !== value || this.opts.es5) {
            code.push(":");
            (0, code_1.addCodeArg)(code, value);
          }
        }
        code.push("}");
        return new code_1._Code(code);
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition));
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf();
        } else if (thenBody) {
          this.code(thenBody).endIf();
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body');
        }
        return this;
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition));
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else());
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else);
      }
      _for(node, forBody) {
        this._blockNode(node);
        if (forBody)
          this.code(forBody).endFor();
        return this;
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody);
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix);
        if (this.opts.es5) {
          const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
          return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
            this.var(name, (0, code_1._)`${arr}[${i}]`);
            forBody(name);
          });
        }
        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
        }
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For);
      }
      // `label` statement
      label(label) {
        return this._leafNode(new Label(label));
      }
      // `break` statement
      break(label) {
        return this._leafNode(new Break(label));
      }
      // `return` statement
      return(value) {
        const node = new Return();
        this._blockNode(node);
        this.code(value);
        if (node.nodes.length !== 1)
          throw new Error('CodeGen: "return" should have one node');
        return this._endBlockNode(Return);
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode)
          throw new Error('CodeGen: "try" without "catch" and "finally"');
        const node = new Try();
        this._blockNode(node);
        this.code(tryBody);
        if (catchCode) {
          const error = this.name("e");
          this._currNode = node.catch = new Catch(error);
          catchCode(error);
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally();
          this.code(finallyCode);
        }
        return this._endBlockNode(Catch, Finally);
      }
      // `throw` statement
      throw(error) {
        return this._leafNode(new Throw(error));
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length);
        if (body)
          this.code(body).endBlock(nodeCount);
        return this;
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop();
        if (len === void 0)
          throw new Error("CodeGen: not in self-balancing block");
        const toClose = this._nodes.length - len;
        if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
        }
        this._nodes.length = len;
        return this;
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_1.nil, async, funcBody) {
        this._blockNode(new Func(name, args, async));
        if (funcBody)
          this.code(funcBody).endFunc();
        return this;
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func);
      }
      optimize(n = 1) {
        while (n-- > 0) {
          this._root.optimizeNodes();
          this._root.optimizeNames(this._root.names, this._constants);
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node);
        return this;
      }
      _blockNode(node) {
        this._currNode.nodes.push(node);
        this._nodes.push(node);
      }
      _endBlockNode(N1, N2) {
        const n = this._currNode;
        if (n instanceof N1 || N2 && n instanceof N2) {
          this._nodes.pop();
          return this;
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
      }
      _elseNode(node) {
        const n = this._currNode;
        if (!(n instanceof If)) {
          throw new Error('CodeGen: "else" without "if"');
        }
        this._currNode = n.else = node;
        return this;
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        const ns = this._nodes;
        return ns[ns.length - 1];
      }
      set _currNode(node) {
        const ns = this._nodes;
        ns[ns.length - 1] = node;
      }
    };
    exports.CodeGen = CodeGen;
    function addNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) + (from[n] || 0);
      return names;
    }
    function addExprNames(names, from) {
      return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
    }
    function optimizeExpr(expr, names, constants) {
      if (expr instanceof code_1.Name)
        return replaceName(expr);
      if (!canOptimize(expr))
        return expr;
      return new code_1._Code(expr._items.reduce((items, c) => {
        if (c instanceof code_1.Name)
          c = replaceName(c);
        if (c instanceof code_1._Code)
          items.push(...c._items);
        else
          items.push(c);
        return items;
      }, []));
      function replaceName(n) {
        const c = constants[n.str];
        if (c === void 0 || names[n.str] !== 1)
          return n;
        delete names[n.str];
        return c;
      }
      function canOptimize(e) {
        return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
      }
    }
    function subtractNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) - (from[n] || 0);
    }
    function not(x) {
      return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
    }
    exports.not = not;
    var andCode = mappend(exports.operators.AND);
    function and(...args) {
      return args.reduce(andCode);
    }
    exports.and = and;
    var orCode = mappend(exports.operators.OR);
    function or(...args) {
      return args.reduce(orCode);
    }
    exports.or = or;
    function mappend(op) {
      return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
    }
    function par(x) {
      return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
    }
  }
});

// node_modules/ajv/dist/compile/util.js
var require_util = __commonJS({
  "node_modules/ajv/dist/compile/util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.checkStrictMode = exports.getErrorPath = exports.Type = exports.useFunc = exports.setEvaluated = exports.evaluatedPropsToName = exports.mergeEvaluated = exports.eachItem = exports.unescapeJsonPointer = exports.escapeJsonPointer = exports.escapeFragment = exports.unescapeFragment = exports.schemaRefOrVal = exports.schemaHasRulesButRef = exports.schemaHasRules = exports.checkUnknownRules = exports.alwaysValidSchema = exports.toHash = void 0;
    var codegen_1 = require_codegen();
    var code_1 = require_code();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    exports.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    exports.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules = self.RULES.keywords;
      for (const key in schema) {
        if (!rules[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    exports.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules[key])
          return true;
      return false;
    }
    exports.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    exports.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
    }
    exports.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str) {
      return unescapeJsonPointer(decodeURIComponent(str));
    }
    exports.unescapeFragment = unescapeFragment;
    function escapeFragment(str) {
      return encodeURIComponent(escapeJsonPointer(str));
    }
    exports.escapeFragment = escapeFragment;
    function escapeJsonPointer(str) {
      if (typeof str == "number")
        return `${str}`;
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    exports.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str) {
      return str.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    exports.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f) {
      if (Array.isArray(xs)) {
        for (const x of xs)
          f(x);
      } else {
        f(xs);
      }
    }
    exports.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    exports.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items) => gen.var("items", items)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    exports.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
    }
    exports.setEvaluated = setEvaluated;
    var snippets = {};
    function useFunc(gen, f) {
      return gen.scopeValue("func", {
        ref: f,
        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
      });
    }
    exports.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (exports.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    exports.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    exports.checkStrictMode = checkStrictMode;
  }
});

// node_modules/ajv/dist/compile/names.js
var require_names = __commonJS({
  "node_modules/ajv/dist/compile/names.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var names = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    exports.default = names;
  }
});

// node_modules/ajv/dist/compile/errors.js
var require_errors = __commonJS({
  "node_modules/ajv/dist/compile/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    exports.keywordError = {
      message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation`
    };
    exports.keyword$DataError = {
      message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)`
    };
    function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj);
      } else {
        returnErrors(it, (0, codegen_1._)`[${errObj}]`);
      }
    }
    exports.reportError = reportError;
    function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      addError(gen, errObj);
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_1.default.vErrors);
      }
    }
    exports.reportExtraError = reportExtraError;
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_1.default.errors, errsCount);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
    }
    exports.resetErrorsCount = resetErrorsCount;
    function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
      if (errsCount === void 0)
        throw new Error("ajv implementation error");
      const err = gen.name("err");
      gen.forRange("i", errsCount, names_1.default.errors, (i) => {
        gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
        gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
        gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
        if (it.opts.verbose) {
          gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
          gen.assign((0, codegen_1._)`${err}.data`, data);
        }
      });
    }
    exports.extendErrors = extendErrors;
    function addError(gen, errObj) {
      const err = gen.const("err", errObj);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
      gen.code((0, codegen_1._)`${names_1.default.errors}++`);
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it;
      if (schemaEnv.$async) {
        gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
        gen.return(false);
      }
    }
    var E = {
      keyword: new codegen_1.Name("keyword"),
      schemaPath: new codegen_1.Name("schemaPath"),
      // also used in JTD errors
      params: new codegen_1.Name("params"),
      propertyName: new codegen_1.Name("propertyName"),
      message: new codegen_1.Name("message"),
      schema: new codegen_1.Name("schema"),
      parentSchema: new codegen_1.Name("parentSchema")
    };
    function errorObjectCode(cxt, error, errorPaths) {
      const { createErrors } = cxt.it;
      if (createErrors === false)
        return (0, codegen_1._)`{}`;
      return errorObject(cxt, error, errorPaths);
    }
    function errorObject(cxt, error, errorPaths = {}) {
      const { gen, it } = cxt;
      const keyValues = [
        errorInstancePath(it, errorPaths),
        errorSchemaPath(cxt, errorPaths)
      ];
      extraErrorProps(cxt, error, keyValues);
      return gen.object(...keyValues);
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
      return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
    }
    function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
      if (schemaPath) {
        schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
      }
      return [E.schemaPath, schPath];
    }
    function extraErrorProps(cxt, { params, message }, keyValues) {
      const { keyword, data, schemaValue, it } = cxt;
      const { opts, propertyName, topSchemaRef, schemaPath } = it;
      keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
      if (opts.messages) {
        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
      }
      if (opts.verbose) {
        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
      }
      if (propertyName)
        keyValues.push([E.propertyName, propertyName]);
    }
  }
});

// node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = __commonJS({
  "node_modules/ajv/dist/compile/validate/boolSchema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.boolOrEmptySchema = exports.topBoolOrEmptySchema = void 0;
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    exports.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    exports.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
  }
});

// node_modules/ajv/dist/compile/rules.js
var require_rules = __commonJS({
  "node_modules/ajv/dist/compile/rules.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRules = exports.isJSONType = void 0;
    var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    var jsonTypes = new Set(_jsonTypes);
    function isJSONType(x) {
      return typeof x == "string" && jsonTypes.has(x);
    }
    exports.isJSONType = isJSONType;
    function getRules() {
      const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    exports.getRules = getRules;
  }
});

// node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = __commonJS({
  "node_modules/ajv/dist/compile/validate/applicability.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.shouldUseRule = exports.shouldUseGroup = exports.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self }, type) {
      const group = self.RULES.types[type];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    exports.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    exports.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    exports.shouldUseRule = shouldUseRule;
  }
});

// node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = __commonJS({
  "node_modules/ajv/dist/compile/validate/dataType.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reportTypeError = exports.checkDataTypes = exports.checkDataType = exports.coerceAndCheckDataType = exports.getJSONTypes = exports.getSchemaTypes = exports.DataType = void 0;
    var rules_1 = require_rules();
    var applicability_1 = require_applicability();
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (exports.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types = getJSONTypes(schema.type);
      const hasNull = types.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types.push("null");
      }
      return types;
    }
    exports.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types.every(rules_1.isJSONType))
        return types;
      throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
    }
    exports.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types, opts.coerceTypes);
      const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports.coerceAndCheckDataType = coerceAndCheckDataType;
    var COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types, coerceTypes) {
      return coerceTypes ? types.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
    }
    function coerceData(it, types, coerceTo) {
      const { gen, data, opts } = it;
      const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t of coerceTo) {
        if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t) {
        switch (t) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    exports.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types = (0, util_1.toHash)(dataTypes);
      if (types.array && types.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types.number)
        delete types.integer;
      for (const t in types)
        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
      return cond;
    }
    exports.checkDataTypes = checkDataTypes;
    var typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    exports.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  }
});

// node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = __commonJS({
  "node_modules/ajv/dist/compile/validate/defaults.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.assignDefaults = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function assignDefaults(it, ty) {
      const { properties, items } = it.schema;
      if (ty === "object" && properties) {
        for (const key in properties) {
          assignDefault(it, key, properties[key].default);
        }
      } else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i) => assignDefault(it, i, sch.default));
      }
    }
    exports.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
  }
});

// node_modules/ajv/dist/vocabularies/code.js
var require_code2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/code.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateUnion = exports.validateArray = exports.usePattern = exports.callValidateCode = exports.schemaProperties = exports.allSchemaProperties = exports.noPropertyInData = exports.propertyInData = exports.isOwnProperty = exports.hasPropFunc = exports.reportMissingProp = exports.checkMissingProp = exports.checkReportMissingProp = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var util_2 = require_util();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    exports.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
      return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    exports.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    exports.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    exports.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    exports.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    exports.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    exports.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
    }
    exports.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
    }
    exports.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    exports.callValidateCode = callValidateCode;
    var newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern) {
      const u = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern, u);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
      });
    }
    exports.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema({
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    exports.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: i,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    exports.validateUnion = validateUnion;
  }
});

// node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = __commonJS({
  "node_modules/ajv/dist/compile/validate/keyword.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateKeywordUsage = exports.validSchemaType = exports.funcKeywordCode = exports.macroKeywordCode = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var code_1 = require_code2();
    var errors_1 = require_errors();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    exports.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword, validate);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors);
      }
    }
    exports.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword, result) {
      if (result === void 0)
        throw new Error(`keyword "${keyword}" failed to compile`);
      return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    exports.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
          const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    exports.validateKeywordUsage = validateKeywordUsage;
  }
});

// node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = __commonJS({
  "node_modules/ajv/dist/compile/validate/subschema.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.extendSubschemaMode = exports.extendSubschemaData = exports.getSubschema = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword !== void 0) {
        const sch = it.schema[keyword];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    exports.getSubschema = getSubschema;
    function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema.propertyName = propertyName;
      }
      if (dataTypes)
        subschema.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
      }
    }
    exports.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema.allErrors = allErrors;
      subschema.jtdDiscriminator = jtdDiscriminator;
      subschema.jtdMetadata = jtdMetadata;
    }
    exports.extendSubschemaMode = extendSubschemaMode;
  }
});

// node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/fast-deep-equal/index.js"(exports, module) {
    "use strict";
    module.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = __commonJS({
  "node_modules/json-schema-traverse/index.js"(exports, module) {
    "use strict";
    var traverse = module.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post = cb.post || function() {
      };
      _traverse(opts, pre, post, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i = 0; i < sch.length; i++)
                _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str) {
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }
});

// node_modules/ajv/dist/compile/resolve.js
var require_resolve = __commonJS({
  "node_modules/ajv/dist/compile/resolve.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSchemaRefs = exports.resolveUrl = exports.normalizeId = exports._getFullPath = exports.getFullPath = exports.inlineRef = void 0;
    var util_1 = require_util();
    var equal = require_fast_deep_equal();
    var traverse = require_json_schema_traverse();
    var SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit === true)
        return !hasRef(schema);
      if (!limit)
        return false;
      return countKeys(schema) <= limit;
    }
    exports.inlineRef = inlineRef;
    var REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id = "", normalize2) {
      if (normalize2 !== false)
        id = normalizeId(id);
      const p = resolver.parse(id);
      return _getFullPath(resolver, p);
    }
    exports.getFullPath = getFullPath;
    function _getFullPath(resolver, p) {
      const serialized = resolver.serialize(p);
      return serialized.split("#")[0] + "#";
    }
    exports._getFullPath = _getFullPath;
    var TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id) {
      return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
    }
    exports.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id) {
      id = normalizeId(id);
      return resolver.resolve(baseId, id);
    }
    exports.resolveUrl = resolveUrl;
    var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          const _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref))
            throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref);
          } else if (ref !== normalizeId(fullPath)) {
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else {
              this.refs[ref] = fullPath;
            }
          }
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== void 0 && !equal(sch1, sch2))
          throw ambiguos(ref);
      }
      function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
      }
    }
    exports.getSchemaRefs = getSchemaRefs;
  }
});

// node_modules/ajv/dist/compile/validate/index.js
var require_validate = __commonJS({
  "node_modules/ajv/dist/compile/validate/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getData = exports.KeywordCxt = exports.validateFunctionCode = void 0;
    var boolSchema_1 = require_boolSchema();
    var dataType_1 = require_dataType();
    var applicability_1 = require_applicability();
    var dataType_2 = require_dataType();
    var defaults_1 = require_defaults();
    var keyword_1 = require_keyword();
    var subschema_1 = require_subschema();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var errors_1 = require_errors();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    exports.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
      schemaKeywords(it, types, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items);
    }
    function schemaKeywords(it, types, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self } = it;
      const { RULES } = self;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types.length === 1 && types[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types) {
      if (!types.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types;
        return;
      }
      types.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
          strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules = it.self.RULES.all;
      for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type } = rule.definition;
          if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
            strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t) {
      return ts.includes(t) || t === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t of it.dataTypes) {
        if (includesType(withTypes, t))
          ts.push(t);
        else if (withTypes.includes("integer") && t === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    var KeywordCxt = class {
      constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        ;
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    };
    exports.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    exports.getData = getData;
  }
});

// node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = __commonJS({
  "node_modules/ajv/dist/runtime/validation_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var ValidationError = class extends Error {
      constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
      }
    };
    exports.default = ValidationError;
  }
});

// node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = __commonJS({
  "node_modules/ajv/dist/compile/ref_error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var resolve_1 = require_resolve();
    var MissingRefError = class extends Error {
      constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    };
    exports.default = MissingRefError;
  }
});

// node_modules/ajv/dist/compile/index.js
var require_compile = __commonJS({
  "node_modules/ajv/dist/compile/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.resolveSchema = exports.getCompilingSchema = exports.resolveRef = exports.compileSchema = exports.SchemaEnv = void 0;
    var codegen_1 = require_codegen();
    var validation_error_1 = require_validation_error();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var validate_1 = require_validate();
    var SchemaEnv = class {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    };
    exports.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
          validate.$async = true;
        if (this.opts.code.source === true) {
          validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items } = schemaCxt;
          validate.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items instanceof codegen_1.Name ? void 0 : items,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items instanceof codegen_1.Name
          };
          if (validate.source)
            validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
      } catch (e) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e;
      } finally {
        this._compilations.delete(sch);
      }
    }
    exports.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref) {
      var _a;
      ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
      const schOrFunc = root.refs[ref];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve.call(this, root, ref);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref] = inlineOrCompile.call(this, _sch);
    }
    exports.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    exports.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s2) {
      return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
    }
    function resolve(root, ref) {
      let sch;
      while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
      return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
    }
    function resolveSchema(root, ref) {
      const p = this.opts.uriResolver.parse(ref);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p, root);
      }
      const id = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id] || this.schemas[id];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p, schOrRef);
    }
    exports.resolveSchema = resolveSchema;
    var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
  }
});

// node_modules/ajv/dist/refs/data.json
var require_data = __commonJS({
  "node_modules/ajv/dist/refs/data.json"(exports, module) {
    module.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: {
          type: "string",
          anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
        }
      },
      additionalProperties: false
    };
  }
});

// node_modules/fast-uri/lib/utils.js
var require_utils = __commonJS({
  "node_modules/fast-uri/lib/utils.js"(exports, module) {
    "use strict";
    var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
    var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
    var isPort = RegExp.prototype.test.bind(/^\d*$/u);
    var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
    var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
    var isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);
    var isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);
    var isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);
    var BYTE_HEX = new Array(256);
    {
      const HEX_DIGITS = "0123456789ABCDEF";
      for (let i = 0; i < 256; i++) {
        BYTE_HEX[i] = "%" + HEX_DIGITS[i >> 4] + HEX_DIGITS[i & 15];
      }
    }
    function percentEncodeNonAscii(cp) {
      if (cp < 2048) {
        return BYTE_HEX[192 | cp >> 6] + BYTE_HEX[128 | cp & 63];
      }
      if (cp < 65536) {
        return BYTE_HEX[224 | cp >> 12] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
      }
      return BYTE_HEX[240 | cp >> 18] + BYTE_HEX[128 | cp >> 12 & 63] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
    }
    function stringArrayToHexStripped(input) {
      let acc = "";
      let code = 0;
      let i = 0;
      for (i = 0; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (code === 48) {
          continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
        break;
      }
      for (i += 1; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
      }
      return acc;
    }
    var isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);
    var isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);
    var isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);
    var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function isZoneIdentifier(zone) {
      if (zone.length === 0) return false;
      for (let i = 0; i < zone.length; i++) {
        if (isZoneCharacter(zone[i])) continue;
        if (zone[i] === "%" && i + 2 < zone.length && isHexPair(zone.slice(i + 1, i + 3))) {
          i += 2;
          continue;
        }
        return false;
      }
      return true;
    }
    function compressIPv6ZeroRun(hextets) {
      let bestStart = -1;
      let bestLength = 0;
      let runStart = -1;
      let runLength = 0;
      for (let i = 0; i < hextets.length; i++) {
        if (hextets[i] === "0") {
          if (runStart === -1) runStart = i;
          runLength++;
          if (runLength > bestLength) {
            bestLength = runLength;
            bestStart = runStart;
          }
        } else {
          runStart = -1;
          runLength = 0;
        }
      }
      if (bestLength < 2) return hextets.join(":");
      const head = hextets.slice(0, bestStart).join(":");
      const tail = hextets.slice(bestStart + bestLength).join(":");
      return head + "::" + tail;
    }
    function normalizeIPv6Address(input) {
      const compression = input.indexOf("::");
      if (compression !== -1 && input.indexOf("::", compression + 1) !== -1) return void 0;
      const left = compression === -1 ? input.split(":") : input.slice(0, compression).split(":");
      const right = compression === -1 ? [] : input.slice(compression + 2).split(":");
      if (compression !== -1) {
        if (left.length === 1 && left[0] === "") left.length = 0;
        if (right.length === 1 && right[0] === "") right.length = 0;
      }
      const parts = left.concat(right);
      let hextetCount = 0;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === "") return void 0;
        if (part.indexOf(".") !== -1) {
          if (i !== parts.length - 1 || compression !== -1 && right.length === 0 || !isIPv4(part)) return void 0;
          hextetCount += 2;
          continue;
        }
        if (!isHextet(part)) return void 0;
        parts[i] = parseInt(part, 16).toString(16);
        hextetCount++;
      }
      if (compression === -1) {
        if (hextetCount !== 8) return void 0;
        return compressIPv6ZeroRun(parts);
      }
      if (hextetCount >= 8) return void 0;
      const expanded = parts.slice(0, left.length);
      for (let i = hextetCount; i < 8; i++) expanded.push("0");
      for (let i = left.length; i < parts.length; i++) expanded.push(parts[i]);
      return compressIPv6ZeroRun(expanded);
    }
    function normalizeIPv6(host) {
      const bracketed = host[0] === "[" && host[host.length - 1] === "]";
      const hasBracket = host[0] === "[" || host[host.length - 1] === "]";
      if (hasBracket && !bracketed) return { host, isIPV6: false, error: true };
      let input = bracketed ? host.slice(1, -1) : host;
      if (bracketed && isIPvFuture(input)) {
        input = input.toLowerCase();
        return { host: `[${input}]`, escapedHost: input, isIPV6: false, isIPVFuture: true };
      }
      if (findToken(input, ":") < 2) {
        return { host, isIPV6: false, error: bracketed };
      }
      let zoneIdentifier = "";
      const zoneSeparator = input.indexOf("%");
      if (zoneSeparator !== -1) {
        const separatorLength = input.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === "%25" ? 3 : 1;
        zoneIdentifier = input.slice(zoneSeparator + separatorLength);
        if (!isZoneIdentifier(zoneIdentifier)) return { host, isIPV6: false, error: true };
        input = input.slice(0, zoneSeparator);
      }
      const address = normalizeIPv6Address(input);
      if (address === void 0) return { host, isIPV6: false, error: true };
      return {
        host: address + (zoneIdentifier ? "%" + zoneIdentifier : ""),
        escapedHost: address + (zoneIdentifier ? "%25" + zoneIdentifier : ""),
        isIPV6: true
      };
    }
    function findToken(str, token) {
      let ind = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === token) ind++;
      }
      return ind;
    }
    function removeDotSegments(path12) {
      let input = path12;
      const output = [];
      let nextSlash = -1;
      let len = 0;
      while (len = input.length) {
        if (len === 1) {
          if (input === ".") {
            break;
          } else if (input === "/") {
            output.push("/");
            break;
          } else {
            output.push(input);
            break;
          }
        } else if (len === 2) {
          if (input[0] === ".") {
            if (input[1] === ".") {
              break;
            } else if (input[1] === "/") {
              input = input.slice(2);
              continue;
            }
          } else if (input[0] === "/") {
            if (input[1] === "." || input[1] === "/") {
              output.push("/");
              break;
            }
          }
        } else if (len === 3) {
          if (input === "/..") {
            if (output.length !== 0) {
              output.pop();
            }
            output.push("/");
            break;
          }
        }
        if (input[0] === ".") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(3);
              continue;
            }
          } else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(2);
              continue;
            } else if (input[2] === ".") {
              if (input[3] === "/") {
                input = input.slice(3);
                if (output.length !== 0) {
                  output.pop();
                }
                continue;
              }
            }
          }
        }
        if ((nextSlash = input.indexOf("/", 1)) === -1) {
          output.push(input);
          break;
        } else {
          output.push(input.slice(0, nextSlash));
          input = input.slice(nextSlash);
        }
      }
      return output.join("");
    }
    function removeDotSegmentsRelative(path12) {
      if (path12 === "" || path12[0] === "/") {
        return removeDotSegments(path12);
      }
      const segments = path12.split("/");
      const last = segments.length - 1;
      const output = [];
      let trailingDirectory = false;
      for (let i = 0; i <= last; i++) {
        const segment = segments[i];
        if (segment === "." || segment === "..") {
          if (segment === "..") {
            if (output.length !== 0 && output[output.length - 1] !== "..") {
              output.pop();
            } else {
              output.push("..");
            }
          }
          trailingDirectory = i === last;
        } else {
          output.push(segment);
        }
      }
      if (trailingDirectory && output[output.length - 1] !== "..") {
        output.push("");
      }
      if (output.length === 0 || output[0] === "" || output[0].includes(":")) {
        output.unshift(".");
      }
      return output.join("/");
    }
    var HOST_DELIMS = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" };
    var HOST_DELIM_RE = /[@/?#:]/g;
    var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
    function reescapeHostDelimiters(host, isIP) {
      const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
      re.lastIndex = 0;
      return host.replace(re, (ch) => HOST_DELIMS[ch]);
    }
    function normalizePercentEncoding(input, decodeUnreserved = false) {
      if (input.indexOf("%") === -1) {
        return input;
      }
      let output = "";
      for (let i = 0; i < input.length; i++) {
        if (input[i] === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decodeUnreserved && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        output += input[i];
      }
      return output;
    }
    function normalizePathEncoding(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decoded !== "." && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        if (isPathCharacter(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function serializePathEncoding(input, pathNoScheme = false) {
      let output = "";
      let firstSegment = pathNoScheme && input[0] !== "/";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        if (ch === "/") {
          firstSegment = false;
        }
        if (isPathCharacter(ch) && (ch !== ":" || !firstSegment)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeComponent(input, isAllowed) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        if (isAllowed(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeUserinfo(input) {
      return encodeComponent(input, isUserinfoCharacter);
    }
    function encodeQuery(input) {
      return encodeComponent(input, isQueryFragmentCharacter);
    }
    function encodeFragment(input) {
      return encodeComponent(input, isQueryFragmentCharacter);
    }
    function isEscapeSafe(cp) {
      return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 42 || cp === 43 || cp === 45 || cp === 46 || cp === 47 || cp === 64 || cp === 95;
    }
    function normalizeQueryFragmentEncoding(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        if (isQueryFragmentCharacter(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function escapePreservingEscapes(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        if (input[i] === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        output += escape(input[i]);
      }
      return output;
    }
    function recomposeAuthority(component) {
      const uriTokens = [];
      if (component.userinfo !== void 0) {
        uriTokens.push(encodeUserinfo(component.userinfo));
        uriTokens.push("@");
      }
      if (component.host !== void 0) {
        let host = component.host;
        if (!isIPv4(host)) {
          let ipV6res = normalizeIPv6(host);
          if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
            host = normalizePercentEncoding(host, true);
            ipV6res = normalizeIPv6(host);
          }
          if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = reescapeHostDelimiters(host, false);
          }
        }
        uriTokens.push(host);
      }
      if (typeof component.port === "number" || typeof component.port === "string") {
        const port = String(component.port);
        if (!isPort(port)) {
          throw new TypeError("URI port is malformed.");
        }
        uriTokens.push(":");
        uriTokens.push(port);
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    module.exports = {
      nonSimpleDomain,
      recomposeAuthority,
      reescapeHostDelimiters,
      normalizePercentEncoding,
      normalizePathEncoding,
      serializePathEncoding,
      normalizeQueryFragmentEncoding,
      encodeUserinfo,
      encodeQuery,
      encodeFragment,
      escapePreservingEscapes,
      removeDotSegments,
      removeDotSegmentsRelative,
      isIPv4,
      isUUID,
      normalizeIPv6,
      stringArrayToHexStripped
    };
  }
});

// node_modules/fast-uri/lib/schemes.js
var require_schemes = __commonJS({
  "node_modules/fast-uri/lib/schemes.js"(exports, module) {
    "use strict";
    var { isUUID } = require_utils();
    var URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;
    var supportedSchemeNames = (
      /** @type {const} */
      [
        "http",
        "https",
        "ws",
        "wss",
        "urn",
        "urn:uuid"
      ]
    );
    function isValidSchemeName(name) {
      return supportedSchemeNames.indexOf(
        /** @type {*} */
        name
      ) !== -1;
    }
    function wsIsSecure(wsComponent) {
      if (wsComponent.secure === true) {
        return true;
      } else if (wsComponent.secure === false) {
        return false;
      } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
      } else {
        return false;
      }
    }
    function httpParse(component) {
      if (!component.host) {
        component.error = component.error || "HTTP URIs must have a host.";
      }
      return component;
    }
    function httpSerialize(component) {
      const secure = String(component.scheme).toLowerCase() === "https";
      if (component.port === (secure ? 443 : 80) || component.port === "") {
        component.port = void 0;
      }
      if (!component.path) {
        component.path = "/";
      }
      return component;
    }
    function wsParse(wsComponent) {
      wsComponent.secure = wsIsSecure(wsComponent);
      wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
      wsComponent.path = void 0;
      wsComponent.query = void 0;
      return wsComponent;
    }
    function wsSerialize(wsComponent) {
      if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
        wsComponent.port = void 0;
      }
      if (typeof wsComponent.secure === "boolean") {
        wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
        wsComponent.secure = void 0;
      }
      if (wsComponent.resourceName) {
        const queryIndex = wsComponent.resourceName.indexOf("?");
        const path12 = queryIndex === -1 ? wsComponent.resourceName : wsComponent.resourceName.slice(0, queryIndex);
        wsComponent.path = path12 && path12 !== "/" ? path12 : void 0;
        wsComponent.query = queryIndex === -1 ? void 0 : wsComponent.resourceName.slice(queryIndex + 1);
        wsComponent.resourceName = void 0;
      }
      wsComponent.fragment = void 0;
      return wsComponent;
    }
    function urnParse(urnComponent, options) {
      if (!urnComponent.path) {
        urnComponent.error = "URN can not be parsed";
        return urnComponent;
      }
      const matches = urnComponent.path.match(URN_REG);
      if (matches && matches[0] === urnComponent.path) {
        const scheme = options.scheme || urnComponent.scheme || "urn";
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = void 0;
        if (schemeHandler) {
          urnComponent = schemeHandler.parse(urnComponent, options);
        }
      } else {
        urnComponent.error = urnComponent.error || "URN can not be parsed.";
      }
      return urnComponent;
    }
    function urnSerialize(urnComponent, options) {
      if (urnComponent.nid === void 0) {
        throw new Error("URN without nid cannot be serialized");
      }
      const scheme = options.scheme || urnComponent.scheme || "urn";
      const nid = urnComponent.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = getSchemeHandler(urnScheme);
      if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
      }
      const uriComponent = urnComponent;
      const nss = urnComponent.nss;
      uriComponent.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponent;
    }
    function urnuuidParse(urnComponent, options) {
      const uuidComponent = urnComponent;
      uuidComponent.uuid = uuidComponent.nss;
      uuidComponent.nss = void 0;
      if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || "UUID is not valid.";
      }
      return uuidComponent;
    }
    function urnuuidSerialize(uuidComponent) {
      const urnComponent = uuidComponent;
      urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
      return urnComponent;
    }
    var http = (
      /** @type {SchemeHandler} */
      {
        scheme: "http",
        domainHost: true,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var https = (
      /** @type {SchemeHandler} */
      {
        scheme: "https",
        domainHost: http.domainHost,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var ws = (
      /** @type {SchemeHandler} */
      {
        scheme: "ws",
        domainHost: true,
        parse: wsParse,
        serialize: wsSerialize
      }
    );
    var wss = (
      /** @type {SchemeHandler} */
      {
        scheme: "wss",
        domainHost: ws.domainHost,
        parse: ws.parse,
        serialize: ws.serialize
      }
    );
    var urn = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn",
        parse: urnParse,
        serialize: urnSerialize,
        skipNormalize: true
      }
    );
    var urnuuid = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn:uuid",
        parse: urnuuidParse,
        serialize: urnuuidSerialize,
        skipNormalize: true
      }
    );
    var SCHEMES = (
      /** @type {Record<SchemeName, SchemeHandler>} */
      {
        http,
        https,
        ws,
        wss,
        urn,
        "urn:uuid": urnuuid
      }
    );
    Object.setPrototypeOf(SCHEMES, null);
    function getSchemeHandler(scheme) {
      return scheme && (SCHEMES[
        /** @type {SchemeName} */
        scheme
      ] || SCHEMES[
        /** @type {SchemeName} */
        scheme.toLowerCase()
      ]) || void 0;
    }
    module.exports = {
      wsIsSecure,
      SCHEMES,
      isValidSchemeName,
      getSchemeHandler
    };
  }
});

// node_modules/fast-uri/index.js
var require_fast_uri = __commonJS({
  "node_modules/fast-uri/index.js"(exports, module) {
    "use strict";
    var { normalizeIPv6, removeDotSegments, removeDotSegmentsRelative, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
    var { SCHEMES, getSchemeHandler } = require_schemes();
    var VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
    var MALFORMED_SCHEME_ERROR = "URI scheme is malformed.";
    var MALFORMED_HOST_ERROR = "URI host is malformed.";
    var FORBIDDEN_DOMAIN_HOST_CHARACTER = /[\0-\x20"#/:<>?@[\\\]^`{|}\x7F]/u;
    function validateScheme(scheme) {
      const stringScheme = String(scheme);
      if (!VALID_SCHEME.test(stringScheme)) {
        throw new TypeError(MALFORMED_SCHEME_ERROR);
      }
      return stringScheme;
    }
    function normalize2(uri, options) {
      if (typeof uri === "string") {
        uri = /** @type {T} */
        normalizeString(uri, options);
      } else if (typeof uri === "object") {
        uri = /** @type {T} */
        parse(serialize(uri, options), options);
      }
      return uri;
    }
    function resolve(baseURI, relativeURI, options) {
      const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
      const {
        parsed: baseParsed,
        malformedAuthorityOrPort: baseMalformed,
        malformedPercentEncoding: baseMalformedPercentEncoding,
        malformedSchemeSpecific: baseMalformedSchemeSpecific,
        malformedHost: baseMalformedHost,
        malformedScheme: baseMalformedScheme
      } = parseWithStatus(baseURI, schemelessOptions);
      const {
        parsed: relativeParsed,
        malformedAuthorityOrPort: relativeMalformed,
        malformedPercentEncoding: relativeMalformedPercentEncoding,
        malformedSchemeSpecific: relativeMalformedSchemeSpecific,
        malformedHost: relativeMalformedHost,
        malformedScheme: relativeMalformedScheme
      } = parseWithStatus(relativeURI, schemelessOptions);
      if (baseMalformed || relativeMalformed || baseMalformedPercentEncoding || relativeMalformedPercentEncoding || baseMalformedSchemeSpecific || relativeMalformedSchemeSpecific || baseMalformedHost || relativeMalformedHost || baseMalformedScheme || relativeMalformedScheme) {
        throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
      }
      const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
      const resolvedSchemeHandler = getSchemeHandler(options && options.scheme || resolved.scheme);
      const resolvedHost = resolved.host;
      const resolvedHostIsIP = resolvedHost !== void 0 && resolvedHost !== "" && (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
      if (hasForbiddenDomainHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP)) {
        throw new Error(MALFORMED_HOST_ERROR);
      }
      canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
      const encodedASCIIHost = resolvedHost && resolvedHost.indexOf("%") !== -1 && !new RegExp("\\P{ASCII}", "u").test(resolvedHost);
      if (resolved.error && !encodedASCIIHost) {
        throw new Error(resolved.error);
      }
      schemelessOptions.skipEscape = true;
      return serialize(resolved, schemelessOptions);
    }
    function resolveComponent(base, relative, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse(serialize(base, options), options);
        relative = parse(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative.path[0] === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              const baseHasAuthority = base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0;
              if (baseHasAuthority && !base.path) {
                target.path = "/" + relative.path;
              } else if (!base.path) {
                target.path = relative.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = base.scheme === void 0 && !baseHasAuthority && target.path[0] !== "/" ? removeDotSegmentsRelative(target.path) : removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function equal(uriA, uriB, options) {
      const normalizedA = normalizeComparableURI(uriA, options);
      const normalizedB = normalizeComparableURI(uriB, options);
      return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA === normalizedB;
    }
    function serialize(cmpts, opts) {
      const component = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      if (component.scheme) {
        component.scheme = validateScheme(component.scheme);
      }
      const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
      const hasAuthority = component.userinfo !== void 0 || component.host !== void 0 || component.port !== void 0;
      const schemelessReference = (component.scheme === void 0 || options.reference === "suffix") && !hasAuthority;
      const pathNoScheme = !options.skipEscape && schemelessReference;
      if (component.path !== void 0) {
        if (!options.skipEscape) {
          component.path = serializePathEncoding(component.path, pathNoScheme);
        } else {
          component.path = normalizePercentEncoding(component.path);
        }
      }
      if (options.reference !== "suffix" && component.scheme) {
        component.scheme = validateScheme(component.scheme);
        uriTokens.push(component.scheme, ":");
      }
      const authority = recomposeAuthority(component);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (component.path && component.path[0] !== "/") {
          uriTokens.push("/");
        }
      }
      if (component.path !== void 0) {
        let s = component.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = schemelessReference && s[0] !== "/" ? removeDotSegmentsRelative(s) : removeDotSegments(s);
        }
        if (schemelessReference) {
          s = serializePathEncoding(s, true);
        }
        if (authority === void 0 && s[0] === "/" && s[1] === "/") {
          s = "/%2F" + s.slice(2);
        }
        uriTokens.push(s);
      }
      if (component.query !== void 0) {
        uriTokens.push("?", encodeQuery(component.query));
      }
      if (component.fragment !== void 0) {
        uriTokens.push("#", encodeFragment(component.fragment));
      }
      return uriTokens.join("");
    }
    var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
    var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
    function getParseError(parsed, matches) {
      if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") {
        return 'URI path must start with "/" when authority is present.';
      }
      if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) {
        return "URI port is malformed.";
      }
      return void 0;
    }
    function hasMalformedPercentEncoding(component) {
      if (component === void 0) return false;
      let percent = component.indexOf("%");
      while (percent !== -1) {
        if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) {
          return true;
        }
        percent = component.indexOf("%", percent + 3);
      }
      return false;
    }
    function isIPLiteral(host) {
      return host[0] === "[" && host[host.length - 1] === "]";
    }
    function hasMalformedComponentPercentEncoding(matches) {
      const host = matches[4];
      return hasMalformedPercentEncoding(matches[3]) || host !== void 0 && !isIPLiteral(host) && hasMalformedPercentEncoding(host) || hasMalformedPercentEncoding(matches[6]) || hasMalformedPercentEncoding(matches[7]) || hasMalformedPercentEncoding(matches[8]);
    }
    function canonicalizeHost(parsed, options, schemeHandler, isIP) {
      if (hasForbiddenDomainHost(parsed, options, schemeHandler, isIP)) {
        parsed.error = parsed.error || MALFORMED_HOST_ERROR;
        return true;
      }
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport) && parsed.host && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
        let url;
        try {
          url = new URL("http://" + parsed.host);
        } catch (e) {
          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
          return true;
        }
        if (!isHostOnlyURL(url)) {
          parsed.error = parsed.error || MALFORMED_HOST_ERROR;
          return true;
        }
        parsed.host = url.hostname;
      }
      return false;
    }
    function hasForbiddenDomainHost(parsed, options, schemeHandler, isIP) {
      return Boolean(
        parsed.host && isIP === false && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && FORBIDDEN_DOMAIN_HOST_CHARACTER.test(parsed.host)
      );
    }
    function isHostOnlyURL(url) {
      return url.username === "" && url.password === "" && url.port === "" && url.pathname === "/" && url.search === "" && url.hash === "" && url.hostname !== "";
    }
    function parseWithStatus(uri, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      let malformedAuthorityOrPort = false;
      let malformedPercentEncoding = false;
      let malformedSchemeSpecific = false;
      let malformedHost = false;
      let malformedIPLiteral = false;
      let malformedScheme = false;
      let isIP = false;
      if (options.reference === "suffix") {
        if (options.scheme) {
          uri = options.scheme + ":" + uri;
        } else {
          uri = "//" + uri;
        }
      }
      const authorityMatch = uri.match(AUTHORITY_PREFIX);
      if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
        parsed.error = "URI authority must not contain a literal backslash.";
        malformedAuthorityOrPort = true;
      }
      const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
      if (introducerMatch !== null) {
        const region = introducerMatch[1];
        const normalizedRegion = region.replace(/[\t\n\r]/g, "");
        if (normalizedRegion.length >= 2) {
          if (normalizedRegion.slice(0, 2) !== "//") {
            parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
            malformedAuthorityOrPort = true;
          } else if (region.length !== normalizedRegion.length) {
            parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
            malformedAuthorityOrPort = true;
          }
        }
      }
      const matches = uri.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (parsed.scheme !== void 0) {
          if (VALID_SCHEME.test(parsed.scheme)) {
            parsed.scheme = parsed.scheme.toLowerCase();
          } else {
            parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
            malformedScheme = true;
          }
        }
        malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
        if (malformedPercentEncoding) {
          parsed.error = parsed.error || "URI contains malformed percent-encoding.";
        }
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        const parseError = getParseError(parsed, matches);
        if (parseError !== void 0) {
          parsed.error = parsed.error || parseError;
          malformedAuthorityOrPort = true;
        }
        if (parsed.host) {
          const ipv4result = isIPv4(parsed.host);
          if (ipv4result === false) {
            const bracketedIPLiteral = isIPLiteral(parsed.host);
            const hasIPLiteralBracket = parsed.host.indexOf("[") !== -1 || parsed.host.indexOf("]") !== -1;
            const ipv6result = normalizeIPv6(parsed.host);
            isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
            malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
            parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();
            if (malformedIPLiteral) {
              parsed.error = parsed.error || MALFORMED_HOST_ERROR;
              malformedAuthorityOrPort = true;
            }
          } else {
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        if (!malformedIPLiteral) {
          malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
        }
        if (uri.indexOf("%") !== -1 && parsed.host !== void 0 && !malformedIPLiteral) {
          let host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
          if (!isIP) {
            host = normalizePercentEncoding(host.toLowerCase());
          }
          parsed.host = isIP || options.scheme !== "null" ? reescapeHostDelimiters(host, isIP) : host;
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (parsed.path) {
            parsed.path = normalizePathEncoding(parsed.path);
          }
          if (parsed.query) {
            parsed.query = normalizeQueryFragmentEncoding(parsed.query);
          }
          if (parsed.fragment) {
            parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
          if (schemeHandler === SCHEMES.urn && parsed.nid === void 0) {
            malformedSchemeSpecific = true;
          }
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme };
    }
    function parse(uri, opts) {
      return parseWithStatus(uri, opts).parsed;
    }
    function normalizeString(uri, opts) {
      return normalizeStringWithStatus(uri, opts).normalized;
    }
    function normalizeStringWithStatus(uri, opts) {
      const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
      return {
        normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
        malformedAuthorityOrPort,
        malformedPercentEncoding,
        malformedSchemeSpecific,
        malformedHost,
        malformedScheme
      };
    }
    function normalizeComparableURI(uri, opts) {
      if (typeof uri !== "string" && typeof uri !== "object") {
        return void 0;
      }
      let value;
      try {
        value = typeof uri === "string" ? uri : serialize(uri, opts);
      } catch {
        return void 0;
      }
      const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
      return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? void 0 : normalized;
    }
    var fastUri = {
      SCHEMES,
      normalize: normalize2,
      resolve,
      resolveComponent,
      equal,
      serialize,
      parse
    };
    module.exports = fastUri;
    module.exports.default = fastUri;
    module.exports.fastUri = fastUri;
  }
});

// node_modules/ajv/dist/runtime/uri.js
var require_uri = __commonJS({
  "node_modules/ajv/dist/runtime/uri.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var uri = require_fast_uri();
    uri.code = 'require("ajv/dist/runtime/uri").default';
    exports.default = uri;
  }
});

// node_modules/ajv/dist/core.js
var require_core = __commonJS({
  "node_modules/ajv/dist/core.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    var ref_error_1 = require_ref_error();
    var rules_1 = require_rules();
    var compile_1 = require_compile();
    var codegen_2 = require_codegen();
    var resolve_1 = require_resolve();
    var dataType_1 = require_dataType();
    var util_1 = require_util();
    var $dataRefSchema = require_data();
    var uri_1 = require_uri();
    var defaultRegExp = (str, flags) => new RegExp(str, flags);
    defaultRegExp.code = "new RegExp";
    var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
    var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error"
    ]);
    var removedOptions = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now."
    };
    var deprecatedOptions = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    };
    var MAX_EXPRESSION = 200;
    function requiredOptions(o) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
      const s = o.strict;
      const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
      const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
      const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
      return {
        strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
        strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
        strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
        strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
        strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      };
    }
    var Ajv = class {
      constructor(opts = {}) {
        this.schemas = {};
        this.refs = {};
        this.formats = /* @__PURE__ */ Object.create(null);
        this._compilations = /* @__PURE__ */ new Set();
        this._loading = {};
        this._cache = /* @__PURE__ */ new Map();
        opts = this.opts = { ...opts, ...requiredOptions(opts) };
        const { es5, lines } = this.opts.code;
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
        this.logger = getLogger(opts.logger);
        const formatOpt = opts.validateFormats;
        opts.validateFormats = false;
        this.RULES = (0, rules_1.getRules)();
        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
        this._metaOpts = getMetaSchemaOptions.call(this);
        if (opts.formats)
          addInitialFormats.call(this);
        this._addVocabularies();
        this._addDefaultMetaSchema();
        if (opts.keywords)
          addInitialKeywords.call(this, opts.keywords);
        if (typeof opts.meta == "object")
          this.addMetaSchema(opts.meta);
        addInitialSchemas.call(this);
        opts.validateFormats = formatOpt;
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts;
        let _dataRefSchema = $dataRefSchema;
        if (schemaId === "id") {
          _dataRefSchema = { ...$dataRefSchema };
          _dataRefSchema.id = _dataRefSchema.$id;
          delete _dataRefSchema.$id;
        }
        if (meta && $data)
          this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts;
        return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
      }
      validate(schemaKeyRef, data) {
        let v;
        if (typeof schemaKeyRef == "string") {
          v = this.getSchema(schemaKeyRef);
          if (!v)
            throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
        } else {
          v = this.compile(schemaKeyRef);
        }
        const valid = v(data);
        if (!("$async" in v))
          this.errors = v.errors;
        return valid;
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta);
        return sch.validate || this._compileSchemaEnv(sch);
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != "function") {
          throw new Error("options.loadSchema should be a function");
        }
        const { loadSchema } = this.opts;
        return runCompileAsync.call(this, schema, meta);
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema);
          const sch = this._addSchema(_schema, _meta);
          return sch.validate || _compileAsync.call(this, sch);
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true);
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch);
          } catch (e) {
            if (!(e instanceof ref_error_1.default))
              throw e;
            checkLoaded.call(this, e);
            await loadMissingSchema.call(this, e.missingSchema);
            return _compileAsync.call(this, sch);
          }
        }
        function checkLoaded({ missingSchema: ref, missingRef }) {
          if (this.refs[ref]) {
            throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
        }
        async function loadMissingSchema(ref) {
          const _schema = await _loadSchema.call(this, ref);
          if (!this.refs[ref])
            await loadMetaSchema.call(this, _schema.$schema);
          if (!this.refs[ref])
            this.addSchema(_schema, ref, meta);
        }
        async function _loadSchema(ref) {
          const p = this._loading[ref];
          if (p)
            return p;
          try {
            return await (this._loading[ref] = loadSchema(ref));
          } finally {
            delete this._loading[ref];
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema)
            this.addSchema(sch, void 0, _meta, _validateSchema);
          return this;
        }
        let id;
        if (typeof schema === "object") {
          const { schemaId } = this.opts;
          id = schema[schemaId];
          if (id !== void 0 && typeof id != "string") {
            throw new Error(`schema ${schemaId} must be string`);
          }
        }
        key = (0, resolve_1.normalizeId)(key || id);
        this._checkUnique(key);
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
        return this;
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema);
        return this;
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == "boolean")
          return true;
        let $schema;
        $schema = schema.$schema;
        if ($schema !== void 0 && typeof $schema != "string") {
          throw new Error("$schema must be a string");
        }
        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
        if (!$schema) {
          this.logger.warn("meta-schema not available");
          this.errors = null;
          return true;
        }
        const valid = this.validate($schema, schema);
        if (!valid && throwOrLogError) {
          const message = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log")
            this.logger.error(message);
          else
            throw new Error(message);
        }
        return valid;
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch;
        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
          keyRef = sch;
        if (sch === void 0) {
          const { schemaId } = this.opts;
          const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
          sch = compile_1.resolveSchema.call(this, root, keyRef);
          if (!sch)
            return;
          this.refs[keyRef] = sch;
        }
        return sch.validate || this._compileSchemaEnv(sch);
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef);
          this._removeAllSchemas(this.refs, schemaKeyRef);
          return this;
        }
        switch (typeof schemaKeyRef) {
          case "undefined":
            this._removeAllSchemas(this.schemas);
            this._removeAllSchemas(this.refs);
            this._cache.clear();
            return this;
          case "string": {
            const sch = getSchEnv.call(this, schemaKeyRef);
            if (typeof sch == "object")
              this._cache.delete(sch.schema);
            delete this.schemas[schemaKeyRef];
            delete this.refs[schemaKeyRef];
            return this;
          }
          case "object": {
            const cacheKey = schemaKeyRef;
            this._cache.delete(cacheKey);
            let id = schemaKeyRef[this.opts.schemaId];
            if (id) {
              id = (0, resolve_1.normalizeId)(id);
              delete this.schemas[id];
              delete this.refs[id];
            }
            return this;
          }
          default:
            throw new Error("ajv.removeSchema: invalid parameter");
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions) {
        for (const def of definitions)
          this.addKeyword(def);
        return this;
      }
      addKeyword(kwdOrDef, def) {
        let keyword;
        if (typeof kwdOrDef == "string") {
          keyword = kwdOrDef;
          if (typeof def == "object") {
            this.logger.warn("these parameters are deprecated, see docs for addKeyword");
            def.keyword = keyword;
          }
        } else if (typeof kwdOrDef == "object" && def === void 0) {
          def = kwdOrDef;
          keyword = def.keyword;
          if (Array.isArray(keyword) && !keyword.length) {
            throw new Error("addKeywords: keyword must be string or non-empty array");
          }
        } else {
          throw new Error("invalid addKeywords parameters");
        }
        checkKeyword.call(this, keyword, def);
        if (!def) {
          (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
          return this;
        }
        keywordMetaschema.call(this, def);
        const definition = {
          ...def,
          type: (0, dataType_1.getJSONTypes)(def.type),
          schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
        };
        (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
        return this;
      }
      getKeyword(keyword) {
        const rule = this.RULES.all[keyword];
        return typeof rule == "object" ? rule.definition : !!rule;
      }
      // Remove keyword
      removeKeyword(keyword) {
        const { RULES } = this;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        for (const group of RULES.rules) {
          const i = group.rules.findIndex((rule) => rule.keyword === keyword);
          if (i >= 0)
            group.rules.splice(i, 1);
        }
        return this;
      }
      // Add format
      addFormat(name, format) {
        if (typeof format == "string")
          format = new RegExp(format);
        this.formats[name] = format;
        return this;
      }
      errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
        if (!errors || errors.length === 0)
          return "No errors";
        return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
      }
      $dataMetaSchema(metaSchema, keywordsJsonPointers) {
        const rules = this.RULES.all;
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split("/").slice(1);
          let keywords = metaSchema;
          for (const seg of segments)
            keywords = keywords[seg];
          for (const key in rules) {
            const rule = rules[key];
            if (typeof rule != "object")
              continue;
            const { $data } = rule.definition;
            const schema = keywords[key];
            if ($data && schema)
              keywords[key] = schemaOrData(schema);
          }
        }
        return metaSchema;
      }
      _removeAllSchemas(schemas, regex) {
        for (const keyRef in schemas) {
          const sch = schemas[keyRef];
          if (!regex || regex.test(keyRef)) {
            if (typeof sch == "string") {
              delete schemas[keyRef];
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema);
              delete schemas[keyRef];
            }
          }
        }
      }
      _addSchema(schema, meta, baseId, validateSchema2 = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
        let id;
        const { schemaId } = this.opts;
        if (typeof schema == "object") {
          id = schema[schemaId];
        } else {
          if (this.opts.jtd)
            throw new Error("schema must be object");
          else if (typeof schema != "boolean")
            throw new Error("schema must be object or boolean");
        }
        let sch = this._cache.get(schema);
        if (sch !== void 0)
          return sch;
        baseId = (0, resolve_1.normalizeId)(id || baseId);
        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
        this._cache.set(sch.schema, sch);
        if (addSchema && !baseId.startsWith("#")) {
          if (baseId)
            this._checkUnique(baseId);
          this.refs[baseId] = sch;
        }
        if (validateSchema2)
          this.validateSchema(schema, true);
        return sch;
      }
      _checkUnique(id) {
        if (this.schemas[id] || this.refs[id]) {
          throw new Error(`schema with key or id "${id}" already exists`);
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta)
          this._compileMetaSchema(sch);
        else
          compile_1.compileSchema.call(this, sch);
        if (!sch.validate)
          throw new Error("ajv implementation error");
        return sch.validate;
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts;
        this.opts = this._metaOpts;
        try {
          compile_1.compileSchema.call(this, sch);
        } finally {
          this.opts = currentOpts;
        }
      }
    };
    Ajv.ValidationError = validation_error_1.default;
    Ajv.MissingRefError = ref_error_1.default;
    exports.default = Ajv;
    function checkOptions(checkOpts, options, msg, log = "error") {
      for (const key in checkOpts) {
        const opt = key;
        if (opt in options)
          this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_1.normalizeId)(keyRef);
      return this.schemas[keyRef] || this.refs[keyRef];
    }
    function addInitialSchemas() {
      const optsSchemas = this.opts.schemas;
      if (!optsSchemas)
        return;
      if (Array.isArray(optsSchemas))
        this.addSchema(optsSchemas);
      else
        for (const key in optsSchemas)
          this.addSchema(optsSchemas[key], key);
    }
    function addInitialFormats() {
      for (const name in this.opts.formats) {
        const format = this.opts.formats[name];
        if (format)
          this.addFormat(name, format);
      }
    }
    function addInitialKeywords(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (const keyword in defs) {
        const def = defs[keyword];
        if (!def.keyword)
          def.keyword = keyword;
        this.addKeyword(def);
      }
    }
    function getMetaSchemaOptions() {
      const metaOpts = { ...this.opts };
      for (const opt of META_IGNORE_OPTIONS)
        delete metaOpts[opt];
      return metaOpts;
    }
    var noLogs = { log() {
    }, warn() {
    }, error() {
    } };
    function getLogger(logger) {
      if (logger === false)
        return noLogs;
      if (logger === void 0)
        return console;
      if (logger.log && logger.warn && logger.error)
        return logger;
      throw new Error("logger must implement log, warn and error methods");
    }
    var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
    function checkKeyword(keyword, def) {
      const { RULES } = this;
      (0, util_1.eachItem)(keyword, (kwd) => {
        if (RULES.keywords[kwd])
          throw new Error(`Keyword ${kwd} is already defined`);
        if (!KEYWORD_NAME.test(kwd))
          throw new Error(`Keyword ${kwd} has invalid name`);
      });
      if (!def)
        return;
      if (def.$data && !("code" in def || "validate" in def)) {
        throw new Error('$data keyword must have "code" or "validate" function');
      }
    }
    function addRule(keyword, definition, dataType) {
      var _a;
      const post = definition === null || definition === void 0 ? void 0 : definition.post;
      if (dataType && post)
        throw new Error('keyword with "post" flag cannot have "type"');
      const { RULES } = this;
      let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.rules.push(ruleGroup);
      }
      RULES.keywords[keyword] = true;
      if (!definition)
        return;
      const rule = {
        keyword,
        definition: {
          ...definition,
          type: (0, dataType_1.getJSONTypes)(definition.type),
          schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
        }
      };
      if (definition.before)
        addBeforeRule.call(this, ruleGroup, rule, definition.before);
      else
        ruleGroup.rules.push(rule);
      RULES.all[keyword] = rule;
      (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
      if (i >= 0) {
        ruleGroup.rules.splice(i, 0, rule);
      } else {
        ruleGroup.rules.push(rule);
        this.logger.warn(`rule ${before} is not defined`);
      }
    }
    function keywordMetaschema(def) {
      let { metaSchema } = def;
      if (metaSchema === void 0)
        return;
      if (def.$data && this.opts.$data)
        metaSchema = schemaOrData(metaSchema);
      def.validateSchema = this.compile(metaSchema, true);
    }
    var $dataRef = {
      $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
    };
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] };
    }
  }
});

// node_modules/ajv/dist/vocabularies/core/id.js
var require_id = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/id.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/ref.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.callRef = exports.getValidate = void 0;
    var ref_error_1 = require_ref_error();
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var util_1 = require_util();
    var def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v = getValidate(cxt, sch);
          callRef(cxt, v, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    exports.getValidate = getValidate;
    function callRef(cxt, v, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
          addEvaluatedFrom(v);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e) => {
          gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
          }
        }
      }
    }
    exports.callRef = callRef;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/core/index.js
var require_core2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/core/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var id_1 = require_id();
    var ref_1 = require_ref();
    var core = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    exports.default = core;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitNumber.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    var def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/multipleOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    var def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/ajv/dist/runtime/ucs2length.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitLength.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var ucs2length_1 = require_ucs2length();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/pattern.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var util_1 = require_util();
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    var def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const u = it.opts.unicodeRegExp ? "u" : "";
        if ($data) {
          const { regExp } = it.opts.code;
          const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
          const valid = gen.let("valid");
          gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
          cxt.fail$data((0, codegen_1._)`!${valid}`);
        } else {
          const regExp = (0, code_1.usePattern)(cxt, schema);
          cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/required.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    var def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/ajv/dist/runtime/equal.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports.default = equal;
  }
});

// node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/uniqueItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dataType_1 = require_dataType();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
      params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
    };
    var def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j = gen.let("j");
          cxt.setParams({ i, j });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
        }
        function loopN(i, j) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
          });
        }
        function loopN2(i, j) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/const.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    var def = {
      keyword: "const",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/enum.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    var def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i) {
          const sch = schema[i];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var limitNumber_1 = require_limitNumber();
    var multipleOf_1 = require_multipleOf();
    var limitLength_1 = require_limitLength();
    var pattern_1 = require_pattern();
    var limitProperties_1 = require_limitProperties();
    var required_1 = require_required();
    var limitItems_1 = require_limitItems();
    var uniqueItems_1 = require_uniqueItems();
    var const_1 = require_const();
    var enum_1 = require_enum();
    var validation = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    exports.default = validation;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateAdditionalItems = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items);
      }
    };
    function validateAdditionalItems(cxt, items) {
      const { gen, schema, data, keyword, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items.length, len, (i) => {
          cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    exports.validateAdditionalItems = validateAdditionalItems;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateTuple = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
          keyword,
          schemaProp: i,
          dataProp: i
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l = schArr.length;
        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    exports.validateTuple = validateTuple;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/prefixItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var items_1 = require_items();
    var def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/items2020.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var additionalItems_1 = require_additionalItems();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/contains.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    var def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/dependencies.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    exports.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? "property" : "properties";
        return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    };
    var def = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: exports.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt);
        validatePropertyDeps(cxt, propDeps);
        validateSchemaDeps(cxt, schDeps);
      }
    };
    function splitDependencies({ schema }) {
      const propertyDeps = {};
      const schemaDeps = {};
      for (const key in schema) {
        if (key === "__proto__")
          continue;
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
        deps[key] = schema[key];
      }
      return [propertyDeps, schemaDeps];
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data, it } = cxt;
      if (Object.keys(propertyDeps).length === 0)
        return;
      const missing = gen.let("missing");
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop];
        if (deps.length === 0)
          continue;
        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(", ")
        });
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              (0, code_1.checkReportMissingProp)(cxt, depProp);
            }
          });
        } else {
          gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
    }
    exports.validatePropertyDeps = validatePropertyDeps;
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      for (const prop in schemaDeps) {
        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
          continue;
        gen.if(
          (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
            cxt.mergeValidEvaluated(schCxt, valid);
          },
          () => gen.var(valid, true)
          // TODO var
        );
        cxt.ok(valid);
      }
    }
    exports.validateSchemaDeps = validateSchemaDeps;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/propertyNames.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    var def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var util_1 = require_util();
    var error = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    var def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors) {
          const subschema = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors === false) {
            Object.assign(subschema, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema, valid);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/properties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var validate_1 = require_validate();
    var code_1 = require_code2();
    var util_1 = require_util();
    var additionalProperties_1 = require_additionalProperties();
    var def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
        if (properties.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/patternProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var util_2 = require_util();
    var def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/not.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/anyOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var code_1 = require_code2();
    var def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/oneOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    var def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true
              }, schValid);
            }
            if (i > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/allOf.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/if.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    var def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
            else
              cxt.setParams({ ifClause: keyword });
          };
        }
      }
    };
    function hasSchema(it, keyword) {
      const schema = it.schema[keyword];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/thenElse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var additionalItems_1 = require_additionalItems();
    var prefixItems_1 = require_prefixItems();
    var items_1 = require_items();
    var items2020_1 = require_items2020();
    var contains_1 = require_contains();
    var dependencies_1 = require_dependencies();
    var propertyNames_1 = require_propertyNames();
    var additionalProperties_1 = require_additionalProperties();
    var properties_1 = require_properties();
    var patternProperties_1 = require_patternProperties();
    var not_1 = require_not();
    var anyOf_1 = require_anyOf();
    var oneOf_1 = require_oneOf();
    var allOf_1 = require_allOf();
    var if_1 = require_if();
    var thenElse_1 = require_thenElse();
    function getApplicator(draft2020 = false) {
      const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
      else
        applicator.push(additionalItems_1.default, items_1.default);
      applicator.push(contains_1.default);
      return applicator;
    }
    exports.default = getApplicator;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js
var require_dynamicAnchor = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dynamicAnchor = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicAnchor",
      schemaType: "string",
      code: (cxt) => dynamicAnchor(cxt, cxt.schema)
    };
    function dynamicAnchor(cxt, anchor) {
      const { gen, it } = cxt;
      it.schemaEnv.root.dynamicAnchors[anchor] = true;
      const v = (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
      const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
      gen.if((0, codegen_1._)`!${v}`, () => gen.assign(v, validate));
    }
    exports.dynamicAnchor = dynamicAnchor;
    function _getValidate(cxt) {
      const { schemaEnv, schema, self } = cxt.it;
      const { root, baseId, localRefs, meta } = schemaEnv.root;
      const { schemaId } = self.opts;
      const sch = new compile_1.SchemaEnv({ schema, schemaId, root, baseId, localRefs, meta });
      compile_1.compileSchema.call(self, sch);
      return (0, ref_1.getValidate)(cxt, sch);
    }
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js
var require_dynamicRef = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dynamicRef = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicRef",
      schemaType: "string",
      code: (cxt) => dynamicRef(cxt, cxt.schema)
    };
    function dynamicRef(cxt, ref) {
      const { gen, keyword, it } = cxt;
      if (ref[0] !== "#")
        throw new Error(`"${keyword}" only supports hash fragment reference`);
      const anchor = ref.slice(1);
      if (it.allErrors) {
        _dynamicRef();
      } else {
        const valid = gen.let("valid", false);
        _dynamicRef(valid);
        cxt.ok(valid);
      }
      function _dynamicRef(valid) {
        if (it.schemaEnv.root.dynamicAnchors[anchor]) {
          const v = gen.let("_v", (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`);
          gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
        } else {
          _callRef(it.validateName, valid)();
        }
      }
      function _callRef(validate, valid) {
        return valid ? () => gen.block(() => {
          (0, ref_1.callRef)(cxt, validate);
          gen.let(valid, true);
        }) : () => (0, ref_1.callRef)(cxt, validate);
      }
    }
    exports.dynamicRef = dynamicRef;
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js
var require_recursiveAnchor = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var util_1 = require_util();
    var def = {
      keyword: "$recursiveAnchor",
      schemaType: "boolean",
      code(cxt) {
        if (cxt.schema)
          (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
        else
          (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js
var require_recursiveRef = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dynamicRef_1 = require_dynamicRef();
    var def = {
      keyword: "$recursiveRef",
      schemaType: "string",
      code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema)
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/dynamic/index.js
var require_dynamic = __commonJS({
  "node_modules/ajv/dist/vocabularies/dynamic/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var dynamicRef_1 = require_dynamicRef();
    var recursiveAnchor_1 = require_recursiveAnchor();
    var recursiveRef_1 = require_recursiveRef();
    var dynamic = [dynamicAnchor_1.default, dynamicRef_1.default, recursiveAnchor_1.default, recursiveRef_1.default];
    exports.default = dynamic;
  }
});

// node_modules/ajv/dist/vocabularies/validation/dependentRequired.js
var require_dependentRequired = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/dependentRequired.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentRequired",
      type: "object",
      schemaType: "object",
      error: dependencies_1.error,
      code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt)
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js
var require_dependentSchemas = __commonJS({
  "node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentSchemas",
      type: "object",
      schemaType: "object",
      code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt)
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/validation/limitContains.js
var require_limitContains = __commonJS({
  "node_modules/ajv/dist/vocabularies/validation/limitContains.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["maxContains", "minContains"],
      type: "array",
      schemaType: "number",
      code({ keyword, parentSchema, it }) {
        if (parentSchema.contains === void 0) {
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/next.js
var require_next = __commonJS({
  "node_modules/ajv/dist/vocabularies/next.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var dependentRequired_1 = require_dependentRequired();
    var dependentSchemas_1 = require_dependentSchemas();
    var limitContains_1 = require_limitContains();
    var next = [dependentRequired_1.default, dependentSchemas_1.default, limitContains_1.default];
    exports.default = next;
  }
});

// node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js
var require_unevaluatedProperties = __commonJS({
  "node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var error = {
      message: "must NOT have unevaluated properties",
      params: ({ params }) => (0, codegen_1._)`{unevaluatedProperty: ${params.unevaluatedProperty}}`
    };
    var def = {
      keyword: "unevaluatedProperties",
      type: "object",
      schemaType: ["boolean", "object"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, props } = it;
        if (props instanceof codegen_1.Name) {
          gen.if((0, codegen_1._)`${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
        } else if (props !== true) {
          gen.forIn("key", data, (key) => props === void 0 ? unevaluatedPropCode(key) : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
        }
        it.props = true;
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function unevaluatedPropCode(key) {
          if (schema === false) {
            cxt.setParams({ unevaluatedProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (!(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            cxt.subschema({
              keyword: "unevaluatedProperties",
              dataProp: key,
              dataPropType: util_1.Type.Str
            }, valid);
            if (!allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          }
        }
        function unevaluatedDynamic(evaluatedProps, key) {
          return (0, codegen_1._)`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
        }
        function unevaluatedStatic(evaluatedProps, key) {
          const ps = [];
          for (const p in evaluatedProps) {
            if (evaluatedProps[p] === true)
              ps.push((0, codegen_1._)`${key} !== ${p}`);
          }
          return (0, codegen_1.and)(...ps);
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js
var require_unevaluatedItems = __commonJS({
  "node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "unevaluatedItems",
      type: "array",
      schemaType: ["boolean", "object"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        const items = it.items || 0;
        if (items === true)
          return;
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        if (schema === false) {
          cxt.setParams({ len: items });
          cxt.fail((0, codegen_1._)`${len} > ${items}`);
        } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
          const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items}`);
          gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
          cxt.ok(valid);
        }
        it.items = true;
        function validateItems(valid, from) {
          gen.forRange("i", from, len, (i) => {
            cxt.subschema({ keyword: "unevaluatedItems", dataProp: i, dataPropType: util_1.Type.Num }, valid);
            if (!it.allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          });
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/unevaluated/index.js
var require_unevaluated = __commonJS({
  "node_modules/ajv/dist/vocabularies/unevaluated/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var unevaluatedProperties_1 = require_unevaluatedProperties();
    var unevaluatedItems_1 = require_unevaluatedItems();
    var unevaluated = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
    exports.default = unevaluated;
  }
});

// node_modules/ajv/dist/vocabularies/format/format.js
var require_format = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/format.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    var def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
            return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/vocabularies/format/index.js
var require_format2 = __commonJS({
  "node_modules/ajv/dist/vocabularies/format/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var format_1 = require_format();
    var format = [format_1.default];
    exports.default = format;
  }
});

// node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = __commonJS({
  "node_modules/ajv/dist/vocabularies/metadata.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.contentVocabulary = exports.metadataVocabulary = void 0;
    exports.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    exports.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
  }
});

// node_modules/ajv/dist/vocabularies/draft2020.js
var require_draft2020 = __commonJS({
  "node_modules/ajv/dist/vocabularies/draft2020.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var dynamic_1 = require_dynamic();
    var next_1 = require_next();
    var unevaluated_1 = require_unevaluated();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft2020Vocabularies = [
      dynamic_1.default,
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(true),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary,
      next_1.default,
      unevaluated_1.default
    ];
    exports.default = draft2020Vocabularies;
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/types.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (exports.DiscrError = DiscrError = {}));
  }
});

// node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = __commonJS({
  "node_modules/ajv/dist/vocabularies/discriminator/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var types_1 = require_types();
    var compile_1 = require_compile();
    var ref_error_1 = require_ref_error();
    var util_1 = require_util();
    var error = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    };
    var def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i = 0; i < oneOf.length; i++) {
            let sch = oneOf[i];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required }) {
            return Array.isArray(required) && required.includes(tagName);
          }
          function addMappings(sch, i) {
            if (sch.const) {
              addMapping(sch.const, i);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i;
          }
        }
      }
    };
    exports.default = def;
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/schema.json
var require_schema = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/schema.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/schema",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true,
        "https://json-schema.org/draft/2020-12/vocab/applicator": true,
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
        "https://json-schema.org/draft/2020-12/vocab/validation": true,
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Core and Validation specifications meta-schema",
      allOf: [
        { $ref: "meta/core" },
        { $ref: "meta/applicator" },
        { $ref: "meta/unevaluated" },
        { $ref: "meta/validation" },
        { $ref: "meta/meta-data" },
        { $ref: "meta/format-annotation" },
        { $ref: "meta/content" }
      ],
      type: ["object", "boolean"],
      $comment: "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.",
      properties: {
        definitions: {
          $comment: '"definitions" has been replaced by "$defs".',
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          deprecated: true,
          default: {}
        },
        dependencies: {
          $comment: '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
          type: "object",
          additionalProperties: {
            anyOf: [{ $dynamicRef: "#meta" }, { $ref: "meta/validation#/$defs/stringArray" }]
          },
          deprecated: true,
          default: {}
        },
        $recursiveAnchor: {
          $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
          $ref: "meta/core#/$defs/anchorString",
          deprecated: true
        },
        $recursiveRef: {
          $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
          $ref: "meta/core#/$defs/uriReferenceString",
          deprecated: true
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json
var require_applicator2 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/applicator",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/applicator": true
      },
      $dynamicAnchor: "meta",
      title: "Applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        prefixItems: { $ref: "#/$defs/schemaArray" },
        items: { $dynamicRef: "#meta" },
        contains: { $dynamicRef: "#meta" },
        additionalProperties: { $dynamicRef: "#meta" },
        properties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependentSchemas: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        propertyNames: { $dynamicRef: "#meta" },
        if: { $dynamicRef: "#meta" },
        then: { $dynamicRef: "#meta" },
        else: { $dynamicRef: "#meta" },
        allOf: { $ref: "#/$defs/schemaArray" },
        anyOf: { $ref: "#/$defs/schemaArray" },
        oneOf: { $ref: "#/$defs/schemaArray" },
        not: { $dynamicRef: "#meta" }
      },
      $defs: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $dynamicRef: "#meta" }
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json
var require_unevaluated2 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true
      },
      $dynamicAnchor: "meta",
      title: "Unevaluated applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        unevaluatedItems: { $dynamicRef: "#meta" },
        unevaluatedProperties: { $dynamicRef: "#meta" }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json
var require_content = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/content",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Content vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        contentEncoding: { type: "string" },
        contentMediaType: { type: "string" },
        contentSchema: { $dynamicRef: "#meta" }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json
var require_core3 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/core",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true
      },
      $dynamicAnchor: "meta",
      title: "Core vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        $id: {
          $ref: "#/$defs/uriReferenceString",
          $comment: "Non-empty fragments not allowed.",
          pattern: "^[^#]*#?$"
        },
        $schema: { $ref: "#/$defs/uriString" },
        $ref: { $ref: "#/$defs/uriReferenceString" },
        $anchor: { $ref: "#/$defs/anchorString" },
        $dynamicRef: { $ref: "#/$defs/uriReferenceString" },
        $dynamicAnchor: { $ref: "#/$defs/anchorString" },
        $vocabulary: {
          type: "object",
          propertyNames: { $ref: "#/$defs/uriString" },
          additionalProperties: {
            type: "boolean"
          }
        },
        $comment: {
          type: "string"
        },
        $defs: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" }
        }
      },
      $defs: {
        anchorString: {
          type: "string",
          pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
        },
        uriString: {
          type: "string",
          format: "uri"
        },
        uriReferenceString: {
          type: "string",
          format: "uri-reference"
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json
var require_format_annotation = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true
      },
      $dynamicAnchor: "meta",
      title: "Format vocabulary meta-schema for annotation results",
      type: ["object", "boolean"],
      properties: {
        format: { type: "string" }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json
var require_meta_data = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true
      },
      $dynamicAnchor: "meta",
      title: "Meta-data vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        deprecated: {
          type: "boolean",
          default: false
        },
        readOnly: {
          type: "boolean",
          default: false
        },
        writeOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json
var require_validation2 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json"(exports, module) {
    module.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/validation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/validation": true
      },
      $dynamicAnchor: "meta",
      title: "Validation vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        type: {
          anyOf: [
            { $ref: "#/$defs/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/$defs/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        const: true,
        enum: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/$defs/nonNegativeInteger" },
        minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        maxItems: { $ref: "#/$defs/nonNegativeInteger" },
        minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        maxContains: { $ref: "#/$defs/nonNegativeInteger" },
        minContains: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 1
        },
        maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
        minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        required: { $ref: "#/$defs/stringArray" },
        dependentRequired: {
          type: "object",
          additionalProperties: {
            $ref: "#/$defs/stringArray"
          }
        }
      },
      $defs: {
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 0
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      }
    };
  }
});

// node_modules/ajv/dist/refs/json-schema-2020-12/index.js
var require_json_schema_2020_12 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-2020-12/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var metaSchema = require_schema();
    var applicator = require_applicator2();
    var unevaluated = require_unevaluated2();
    var content = require_content();
    var core = require_core3();
    var format = require_format_annotation();
    var metadata = require_meta_data();
    var validation = require_validation2();
    var META_SUPPORT_DATA = ["/properties"];
    function addMetaSchema2020($data) {
      ;
      [
        metaSchema,
        applicator,
        unevaluated,
        content,
        core,
        with$data(this, format),
        metadata,
        with$data(this, validation)
      ].forEach((sch) => this.addMetaSchema(sch, void 0, false));
      return this;
      function with$data(ajv2, sch) {
        return $data ? ajv2.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
      }
    }
    exports.default = addMetaSchema2020;
  }
});

// node_modules/ajv/dist/2020.js
var require__ = __commonJS({
  "node_modules/ajv/dist/2020.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv2020 = void 0;
    var core_1 = require_core();
    var draft2020_1 = require_draft2020();
    var discriminator_1 = require_discriminator();
    var json_schema_2020_12_1 = require_json_schema_2020_12();
    var META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
    var Ajv20202 = class extends core_1.default {
      constructor(opts = {}) {
        super({
          ...opts,
          dynamicRef: true,
          next: true,
          unevaluated: true
        });
      }
      _addVocabularies() {
        super._addVocabularies();
        draft2020_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        const { $data, meta } = this.opts;
        if (!meta)
          return;
        json_schema_2020_12_1.default.call(this, $data);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports.Ajv2020 = Ajv20202;
    module.exports = exports = Ajv20202;
    module.exports.Ajv2020 = Ajv20202;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Ajv20202;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// node_modules/ajv-formats/dist/formats.js
var require_formats = __commonJS({
  "node_modules/ajv-formats/dist/formats.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
    function fmtDef(validate, compare) {
      return { validate, compare };
    }
    exports.fullFormats = {
      // date: http://tools.ietf.org/html/rfc3339#section-5.6
      date: fmtDef(date, compareDate),
      // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
      time: fmtDef(getTime(true), compareTime),
      "date-time": fmtDef(getDateTime(true), compareDateTime),
      "iso-time": fmtDef(getTime(), compareIsoTime),
      "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
      // duration: https://tools.ietf.org/html/rfc3339#appendix-A
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri,
      "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      // uri-template: https://tools.ietf.org/html/rfc6570
      "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      // For the source: https://gist.github.com/dperini/729294
      // For test cases: https://mathiasbynens.be/demo/url-regex
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex,
      // uuid: http://tools.ietf.org/html/rfc4122
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      // JSON-pointer: https://tools.ietf.org/html/rfc6901
      // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
      // byte: https://github.com/miguelmota/is-base64
      byte,
      // signed 32 bit integer
      int32: { type: "number", validate: validateInt32 },
      // signed 64 bit integer
      int64: { type: "number", validate: validateInt64 },
      // C-type float
      float: { type: "number", validate: validateNumber },
      // C-type double
      double: { type: "number", validate: validateNumber },
      // hint to the UI to hide input strings
      password: true,
      // unchecked string payload
      binary: true
    };
    exports.fastFormats = {
      ...exports.fullFormats,
      date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
      time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
      "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
      "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
      "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
      // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
      uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
      "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
      // email (sources from jsen validator):
      // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
      email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
    };
    exports.formatNames = Object.keys(exports.fullFormats);
    function isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
    var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function date(str) {
      const matches = DATE.exec(str);
      if (!matches)
        return false;
      const year = +matches[1];
      const month = +matches[2];
      const day = +matches[3];
      return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
    }
    function compareDate(d1, d2) {
      if (!(d1 && d2))
        return void 0;
      if (d1 > d2)
        return 1;
      if (d1 < d2)
        return -1;
      return 0;
    }
    var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function getTime(strictTimeZone) {
      return function time(str) {
        const matches = TIME.exec(str);
        if (!matches)
          return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
          return false;
        if (hr <= 23 && min <= 59 && sec < 60)
          return true;
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
      };
    }
    function compareTime(s1, s2) {
      if (!(s1 && s2))
        return void 0;
      const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
      const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
      if (!(t1 && t2))
        return void 0;
      return t1 - t2;
    }
    function compareIsoTime(t1, t2) {
      if (!(t1 && t2))
        return void 0;
      const a1 = TIME.exec(t1);
      const a2 = TIME.exec(t2);
      if (!(a1 && a2))
        return void 0;
      t1 = a1[1] + a1[2] + a1[3];
      t2 = a2[1] + a2[2] + a2[3];
      if (t1 > t2)
        return 1;
      if (t1 < t2)
        return -1;
      return 0;
    }
    var DATE_TIME_SEPARATOR = /t|\s/i;
    function getDateTime(strictTimeZone) {
      const time = getTime(strictTimeZone);
      return function date_time(str) {
        const dateTime = str.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
      };
    }
    function compareDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const d1 = new Date(dt1).valueOf();
      const d2 = new Date(dt2).valueOf();
      if (!(d1 && d2))
        return void 0;
      return d1 - d2;
    }
    function compareIsoDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
      const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
      const res = compareDate(d1, d2);
      if (res === void 0)
        return void 0;
      return res || compareTime(t1, t2);
    }
    var NOT_URI_FRAGMENT = /\/|:/;
    var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function uri(str) {
      return NOT_URI_FRAGMENT.test(str) && URI.test(str);
    }
    var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function byte(str) {
      BYTE.lastIndex = 0;
      return BYTE.test(str);
    }
    var MIN_INT32 = -(2 ** 31);
    var MAX_INT32 = 2 ** 31 - 1;
    function validateInt32(value) {
      return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
    }
    function validateInt64(value) {
      return Number.isInteger(value);
    }
    function validateNumber() {
      return true;
    }
    var Z_ANCHOR = /[^\\]\\Z/;
    function regex(str) {
      if (Z_ANCHOR.test(str))
        return false;
      try {
        new RegExp(str);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

// node_modules/ajv/dist/vocabularies/draft7.js
var require_draft7 = __commonJS({
  "node_modules/ajv/dist/vocabularies/draft7.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft7Vocabularies = [
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary
    ];
    exports.default = draft7Vocabularies;
  }
});

// node_modules/ajv/dist/refs/json-schema-draft-07.json
var require_json_schema_draft_07 = __commonJS({
  "node_modules/ajv/dist/refs/json-schema-draft-07.json"(exports, module) {
    module.exports = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "http://json-schema.org/draft-07/schema#",
      title: "Core schema meta-schema",
      definitions: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $ref: "#" }
        },
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }]
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      },
      type: ["object", "boolean"],
      properties: {
        $id: {
          type: "string",
          format: "uri-reference"
        },
        $schema: {
          type: "string",
          format: "uri"
        },
        $ref: {
          type: "string",
          format: "uri-reference"
        },
        $comment: {
          type: "string"
        },
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        readOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/definitions/nonNegativeInteger" },
        minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        additionalItems: { $ref: "#" },
        items: {
          anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
          default: true
        },
        maxItems: { $ref: "#/definitions/nonNegativeInteger" },
        minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        contains: { $ref: "#" },
        maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
        minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        required: { $ref: "#/definitions/stringArray" },
        additionalProperties: { $ref: "#" },
        definitions: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        properties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependencies: {
          type: "object",
          additionalProperties: {
            anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
          }
        },
        propertyNames: { $ref: "#" },
        const: true,
        enum: {
          type: "array",
          items: true,
          minItems: 1,
          uniqueItems: true
        },
        type: {
          anyOf: [
            { $ref: "#/definitions/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/definitions/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        format: { type: "string" },
        contentMediaType: { type: "string" },
        contentEncoding: { type: "string" },
        if: { $ref: "#" },
        then: { $ref: "#" },
        else: { $ref: "#" },
        allOf: { $ref: "#/definitions/schemaArray" },
        anyOf: { $ref: "#/definitions/schemaArray" },
        oneOf: { $ref: "#/definitions/schemaArray" },
        not: { $ref: "#" }
      },
      default: true
    };
  }
});

// node_modules/ajv/dist/ajv.js
var require_ajv = __commonJS({
  "node_modules/ajv/dist/ajv.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv = void 0;
    var core_1 = require_core();
    var draft7_1 = require_draft7();
    var discriminator_1 = require_discriminator();
    var draft7MetaSchema = require_json_schema_draft_07();
    var META_SUPPORT_DATA = ["/properties"];
    var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
    var Ajv = class extends core_1.default {
      _addVocabularies() {
        super._addVocabularies();
        draft7_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        if (!this.opts.meta)
          return;
        const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
        this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports.Ajv = Ajv;
    module.exports = exports = Ajv;
    module.exports.Ajv = Ajv;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Ajv;
    var validate_1 = require_validate();
    Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// node_modules/ajv-formats/dist/limit.js
var require_limit = __commonJS({
  "node_modules/ajv-formats/dist/limit.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.formatLimitDefinition = void 0;
    var ajv_1 = require_ajv();
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`should be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    exports.formatLimitDefinition = {
      keyword: Object.keys(KWDs),
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, keyword, it } = cxt;
        const { opts, self } = it;
        if (!opts.validateFormats)
          return;
        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
        if (fCxt.$data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
          cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
        }
        function validateFormat() {
          const format = fCxt.schema;
          const fmtDef = self.formats[format];
          if (!fmtDef || fmtDef === true)
            return;
          if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
            throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
          }
          const fmt = gen.scopeValue("formats", {
            key: format,
            ref: fmtDef,
            code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : void 0
          });
          cxt.fail$data(compareCode(fmt));
        }
        function compareCode(fmt) {
          return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
        }
      },
      dependencies: ["format"]
    };
    var formatLimitPlugin = (ajv2) => {
      ajv2.addKeyword(exports.formatLimitDefinition);
      return ajv2;
    };
    exports.default = formatLimitPlugin;
  }
});

// node_modules/ajv-formats/dist/index.js
var require_dist = __commonJS({
  "node_modules/ajv-formats/dist/index.js"(exports, module) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var formats_1 = require_formats();
    var limit_1 = require_limit();
    var codegen_1 = require_codegen();
    var fullName = new codegen_1.Name("fullFormats");
    var fastName = new codegen_1.Name("fastFormats");
    var formatsPlugin = (ajv2, opts = { keywords: true }) => {
      if (Array.isArray(opts)) {
        addFormats2(ajv2, opts, formats_1.fullFormats, fullName);
        return ajv2;
      }
      const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
      const list = opts.formats || formats_1.formatNames;
      addFormats2(ajv2, list, formats, exportName);
      if (opts.keywords)
        (0, limit_1.default)(ajv2);
      return ajv2;
    };
    formatsPlugin.get = (name, mode = "full") => {
      const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
      const f = formats[name];
      if (!f)
        throw new Error(`Unknown format "${name}"`);
      return f;
    };
    function addFormats2(ajv2, list, fs, exportName) {
      var _a;
      var _b;
      (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`;
      for (const f of list)
        ajv2.addFormat(f, fs[f]);
    }
    module.exports = exports = formatsPlugin;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = formatsPlugin;
  }
});

// src/index.ts
import path11 from "node:path";
import { pathToFileURL } from "node:url";

// ../analyzer/src/architecture.ts
import path2 from "node:path";

// ../analyzer/src/detector.ts
import path from "node:path";

// ../analyzer/src/manifest.ts
function parsePackageJson(content) {
  const parsed = JSON.parse(content);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("package.json must contain a JSON object");
  }
  return parsed;
}
function hasPackageDependency(packageJson, packageName) {
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const value = packageJson[field];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (packageName in value) return true;
    }
  }
  return false;
}
function hasPythonDependency(content, packageName) {
  if (!content) return false;
  const escaped = packageName.replace(/[.*+?^{}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[\\s=<>~!"',\\[])${escaped}(?:[\\s=<>~!"',;\\[\\]]|$)`, "im").test(content);
}

// ../analyzer/src/detector.ts
var languageByExtension = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".rs": "rust",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".kt": "kotlin",
  ".swift": "swift",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".c": "c"
};
var languageByManifest = {
  "pyproject.toml": "python",
  "go.mod": "go",
  "Cargo.toml": "rust"
};
var frameworkMarkers = {
  "next.config.js": "nextjs",
  "next.config.mjs": "nextjs",
  "next.config.ts": "nextjs",
  "vite.config.ts": "vite",
  "vite.config.js": "vite",
  "angular.json": "angular",
  "nuxt.config.ts": "nuxt",
  "manage.py": "django"
};
var packageManagerMarkers = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "poetry.lock": "poetry",
  "uv.lock": "uv",
  "Pipfile.lock": "pipenv",
  "go.sum": "go",
  "Cargo.lock": "cargo"
};
var manifestNames = /* @__PURE__ */ new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts"
]);
var sourceExtensions = new Set(Object.keys(languageByExtension));
function normalizedPath(file) {
  return file.replaceAll("\\", "/").replace(/^\.\//, "");
}
function directoryOf(file) {
  const directory = path.posix.dirname(file);
  return directory === "." ? "." : directory;
}
function isWithinRoot(file, root) {
  return root === "." || file === root || file.startsWith(`${root}/`);
}
function languageFor(file) {
  return languageByExtension[path.posix.extname(file).toLowerCase()];
}
function packageScopedFacts(snapshot) {
  const files = snapshot.files.map(normalizedPath).sort();
  const manifests = files.filter((file) => manifestNames.has(path.posix.basename(file)));
  const roots = new Set(manifests.map(directoryOf));
  const hasRootLockfile = files.some(
    (file) => directoryOf(file) === "." && Object.hasOwn(packageManagerMarkers, path.posix.basename(file))
  );
  const hasRootMarkers = files.some(
    (file) => directoryOf(file) === "." && (Object.hasOwn(frameworkMarkers, path.posix.basename(file)) || ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "Makefile"].includes(path.posix.basename(file)))
  );
  const hasUnownedSource = files.some(
    (file) => sourceExtensions.has(path.posix.extname(file).toLowerCase()) && ![...roots].some((root) => isWithinRoot(file, root))
  );
  if (hasRootLockfile || hasRootMarkers || hasUnownedSource || roots.size === 0) roots.add(".");
  const orderedRoots = [...roots].sort((a, b) => {
    if (a === ".") return -1;
    if (b === ".") return 1;
    return a.localeCompare(b);
  });
  const ownedByRoot = /* @__PURE__ */ new Map();
  for (const root of orderedRoots) ownedByRoot.set(root, []);
  for (const file of files) {
    const owner = orderedRoots.filter((root) => isWithinRoot(file, root)).sort((a, b) => b.length - a.length)[0];
    if (owner) ownedByRoot.get(owner).push(file);
  }
  const rootPackageManagers = new Set(
    files.filter((file) => directoryOf(file) === ".").map((file) => packageManagerMarkers[path.posix.basename(file)]).filter((value) => Boolean(value))
  );
  return orderedRoots.map((root) => {
    const packageFiles = ownedByRoot.get(root) ?? [];
    const manifestPaths = manifests.filter((file) => directoryOf(file) === root);
    const languages = /* @__PURE__ */ new Set();
    const frameworks = /* @__PURE__ */ new Set();
    const packageManagers = /* @__PURE__ */ new Set();
    const buildSystems = /* @__PURE__ */ new Set();
    const infrastructureSystems = /* @__PURE__ */ new Set();
    const testSystems = /* @__PURE__ */ new Set();
    for (const file of packageFiles) {
      const language = languageFor(file);
      if (language) languages.add(language);
      const basename2 = path.posix.basename(file);
      const markerFramework = frameworkMarkers[basename2];
      if (markerFramework && directoryOf(file) === root) frameworks.add(markerFramework);
      const manager = packageManagerMarkers[basename2];
      if (manager && directoryOf(file) === root) packageManagers.add(manager);
      if (basename2 === "Makefile") buildSystems.add("make");
      if (basename2 === "Dockerfile") buildSystems.add("docker");
      if (basename2 === "docker-compose.yml" || basename2 === "docker-compose.yaml") {
        buildSystems.add("docker-compose");
      }
      if (file.endsWith(".tf") || packageFiles.some((item) => item.startsWith(root === "." ? "terraform/" : `${root}/terraform/`))) {
        infrastructureSystems.add("terraform");
      }
      if (packageFiles.some((item) => {
        const relative = root === "." ? item : item.slice(root.length + 1);
        return relative.split("/").some((segment) => segment === "k8s" || segment === "kubernetes");
      })) {
        infrastructureSystems.add("kubernetes");
      }
      if (/(^|\/)(vitest|jest)\.config\./.test(file)) testSystems.add("javascript-test-runner");
      if (basename2 === "pytest.ini" || basename2 === "conftest.py") testSystems.add("pytest");
      if (file.endsWith("_test.go")) testSystems.add("go-test");
    }
    if (root !== "." && packageManagers.size === 0) {
      for (const manager of rootPackageManagers) packageManagers.add(manager);
    }
    for (const manifestPath of manifestPaths) {
      const content = snapshot.fileContents?.[manifestPath];
      if (content === void 0) continue;
      const basename2 = path.posix.basename(manifestPath);
      if (basename2 === "package.json") {
        try {
          const packageJson = parsePackageJson(content);
          const packages = [
            ["next", "nextjs"],
            ["react", "react"],
            ["express", "express"],
            ["@nestjs/core", "nestjs"],
            ["vite", "vite"]
          ];
          for (const [dependency, framework] of packages) {
            if (hasPackageDependency(packageJson, dependency)) frameworks.add(framework);
          }
        } catch {
        }
      } else if (basename2 === "pyproject.toml" || basename2 === "requirements.txt") {
        if (hasPythonDependency(content, "fastapi")) frameworks.add("fastapi");
        if (hasPythonDependency(content, "django")) frameworks.add("django");
      }
    }
    return {
      id: root === "." ? "package:root" : `package:${root}`,
      root,
      manifestPaths,
      sourceFiles: packageFiles.filter((file) => sourceExtensions.has(path.posix.extname(file).toLowerCase())),
      languages: [...languages].sort(),
      frameworks: [...frameworks].sort(),
      packageManagers: [...packageManagers].sort(),
      buildSystems: [...buildSystems].sort(),
      infrastructureSystems: [...infrastructureSystems].sort(),
      testSystems: [...testSystems].sort()
    };
  }).filter(
    (item) => item.manifestPaths.length > 0 || item.sourceFiles.length > 0 || item.packageManagers.length > 0 || item.buildSystems.length > 0 || item.infrastructureSystems.length > 0
  );
}
function detectRepositoryFacts(snapshot) {
  const files = new Set(snapshot.files.map(normalizedPath));
  const hasBasename = (name) => [...files].some((file) => path.posix.basename(file) === name);
  const hasDirectory = (name) => [...files].some((file) => file.split("/").includes(name));
  const languages = /* @__PURE__ */ new Set();
  const frameworks = /* @__PURE__ */ new Set();
  const packageManagers = /* @__PURE__ */ new Set();
  for (const file of files) {
    const language = languageFor(file);
    if (language) languages.add(language);
  }
  for (const [marker, language] of Object.entries(languageByManifest)) {
    if (hasBasename(marker)) languages.add(language);
  }
  for (const [marker, framework] of Object.entries(frameworkMarkers)) {
    if (hasBasename(marker)) frameworks.add(framework);
  }
  for (const [marker, manager] of Object.entries(packageManagerMarkers)) {
    if (hasBasename(marker)) packageManagers.add(manager);
  }
  const buildSystems = /* @__PURE__ */ new Set();
  if (hasBasename("Makefile")) buildSystems.add("make");
  if (hasBasename("Dockerfile")) buildSystems.add("docker");
  if (hasBasename("docker-compose.yml") || hasBasename("docker-compose.yaml")) {
    buildSystems.add("docker-compose");
  }
  const infrastructureSystems = /* @__PURE__ */ new Set();
  if (hasDirectory("terraform") || [...files].some((file) => file.endsWith(".tf"))) {
    infrastructureSystems.add("terraform");
  }
  if (hasDirectory("k8s") || hasDirectory("kubernetes")) {
    infrastructureSystems.add("kubernetes");
  }
  const testSystems = /* @__PURE__ */ new Set();
  if ([...files].some((file) => /(^|\/)(vitest|jest)\.config\./.test(file))) {
    testSystems.add("javascript-test-runner");
  }
  if ([...files].some((file) => /(^|\/)(pytest.ini|conftest.py)$/.test(file))) {
    testSystems.add("pytest");
  }
  if ([...files].some((file) => file.endsWith("_test.go"))) {
    testSystems.add("go-test");
  }
  return {
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    packageManagers: [...packageManagers].sort(),
    buildSystems: [...buildSystems].sort(),
    infrastructureSystems: [...infrastructureSystems].sort(),
    testSystems: [...testSystems].sort(),
    packages: packageScopedFacts(snapshot)
  };
}

// ../analyzer/src/architecture.ts
var allowedProfileProperties = /* @__PURE__ */ new Set([
  "id",
  "version",
  "name",
  "description",
  "styles",
  "boundaryRules",
  "requiredControls",
  "capabilities",
  "componentMappings",
  "metadata"
]);
function validateArchitectureProfile(value) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: ["Architecture profile must be a JSON object."] };
  }
  const profile = value;
  for (const property of Object.keys(profile)) {
    if (!allowedProfileProperties.has(property)) {
      errors.push(`/${property} is not an allowed profile property.`);
    }
  }
  if (typeof profile.id !== "string" || !/^[a-z][a-z0-9-]*$/.test(profile.id)) {
    errors.push("/id must be a lowercase identifier.");
  }
  if (typeof profile.version !== "string" || !/^\d+\.\d+\.\d+$/.test(profile.version)) {
    errors.push("/version must use semantic version format X.Y.Z.");
  }
  if (typeof profile.name !== "string" || profile.name.trim().length === 0) {
    errors.push("/name must be a non-empty string.");
  }
  if (profile.description !== void 0 && typeof profile.description !== "string") {
    errors.push("/description must be a string.");
  }
  const validateStringArray = (key, required) => {
    const candidate = profile[key];
    if (candidate === void 0 && !required) return;
    if (!Array.isArray(candidate) || candidate.some((item) => typeof item !== "string" || item.trim().length === 0)) {
      errors.push(`/${key} must be an array of non-empty strings.`);
      return;
    }
    if (new Set(candidate).size !== candidate.length) {
      errors.push(`/${key} must not contain duplicates.`);
    }
  };
  validateStringArray("styles", true);
  if (Array.isArray(profile.styles) && profile.styles.length === 0) {
    errors.push("/styles must contain at least one architecture style.");
  }
  validateStringArray("requiredControls", true);
  validateStringArray("capabilities", false);
  if (!Array.isArray(profile.boundaryRules)) {
    errors.push("/boundaryRules must be an array.");
  } else {
    const ruleIds = /* @__PURE__ */ new Set();
    const allowedRuleProperties = /* @__PURE__ */ new Set([
      "id",
      "description",
      "severity",
      "sourcePattern",
      "targetPattern",
      "allowed"
    ]);
    profile.boundaryRules.forEach((candidate, index) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        errors.push(`/boundaryRules/${index} must be an object.`);
        return;
      }
      const rule = candidate;
      for (const property of Object.keys(rule)) {
        if (!allowedRuleProperties.has(property)) {
          errors.push(`/boundaryRules/${index}/${property} is not allowed.`);
        }
      }
      if (typeof rule.id !== "string" || !/^[A-Z0-9][A-Z0-9-]*$/.test(rule.id)) {
        errors.push(`/boundaryRules/${index}/id must be an uppercase rule identifier.`);
      } else if (ruleIds.has(rule.id)) {
        errors.push(`/boundaryRules contains duplicate rule id '${rule.id}'.`);
      } else {
        ruleIds.add(rule.id);
      }
      if (typeof rule.description !== "string" || rule.description.trim().length === 0) {
        errors.push(`/boundaryRules/${index}/description must be a non-empty string.`);
      }
      if (!["P0", "P1", "P2", "P3"].includes(String(rule.severity))) {
        errors.push(`/boundaryRules/${index}/severity must be P0, P1, P2, or P3.`);
      }
      for (const key of ["sourcePattern", "targetPattern"]) {
        if (rule[key] !== void 0 && (typeof rule[key] !== "string" || rule[key].trim().length === 0)) {
          errors.push(`/boundaryRules/${index}/${key} must be a non-empty string when provided.`);
        }
      }
      if (rule.allowed !== void 0 && typeof rule.allowed !== "boolean") {
        errors.push(`/boundaryRules/${index}/allowed must be a boolean when provided.`);
      }
    });
  }
  if (profile.componentMappings !== void 0) {
    if (!profile.componentMappings || typeof profile.componentMappings !== "object" || Array.isArray(profile.componentMappings)) {
      errors.push("/componentMappings must be an object mapping roles to path-pattern arrays.");
    } else {
      for (const [role, patterns] of Object.entries(profile.componentMappings)) {
        if (!/^[a-z][a-z0-9-]*$/.test(role)) {
          errors.push(`/componentMappings/${role} must use a lowercase role identifier.`);
        }
        if (!Array.isArray(patterns) || patterns.length === 0 || patterns.some((pattern) => typeof pattern !== "string" || pattern.trim().length === 0)) {
          errors.push(`/componentMappings/${role} must be a non-empty array of path patterns.`);
        } else if (new Set(patterns).size !== patterns.length) {
          errors.push(`/componentMappings/${role} must not contain duplicate path patterns.`);
        }
      }
    }
  }
  if (profile.metadata !== void 0 && (!profile.metadata || typeof profile.metadata !== "object" || Array.isArray(profile.metadata))) {
    errors.push("/metadata must be an object when provided.");
  }
  return { valid: errors.length === 0, errors };
}
var sourceExtensions2 = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".rs": "rust",
  ".cs": "csharp",
  ".rb": "ruby",
  ".php": "php",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".h": "c",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".hpp": "cpp"
};
var graphableLanguages = /* @__PURE__ */ new Set(["typescript", "javascript", "python"]);
var resolutionExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".py"];
function languageForFile(file) {
  return sourceExtensions2[path2.posix.extname(file).toLowerCase()];
}
function globToRegExp(pattern) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        source += ".*";
        index += 1;
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${source}$`);
}
function mapRoles(file, mappings) {
  if (!mappings) return [];
  return Object.entries(mappings).filter(([, patterns]) => patterns.some((pattern) => globToRegExp(pattern).test(file))).map(([role]) => role).sort();
}
function importsForFile(file, content) {
  const results = [];
  const language = languageForFile(file);
  const patterns = language === "python" ? [
    /^(\s*)from\s+(\.{1,}[\w.]*)\s+import\s+[^\n]+/gm,
    /^(\s*)from\s+([\w.]+)\s+import\s+[^\n]+/gm,
    /^(\s*)import\s+([\w.]+)(?:\s+as\s+\w+)?/gm
  ] : [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const specifier = language === "python" ? match[2] : match[1];
      if (!specifier) continue;
      const start = match.index ?? 0;
      const line = content.slice(0, start).split("\n").length;
      results.push({ specifier, line });
    }
  }
  const unique = /* @__PURE__ */ new Map();
  for (const item of results) unique.set(`${item.line}: ${item.specifier}`, item);
  return [...unique.values()].sort((a, b) => a.line - b.line || a.specifier.localeCompare(b.specifier));
}
function resolveTypeScriptImport(sourceFile, specifier, fileSet) {
  if (!specifier.startsWith(".")) return void 0;
  const base = path2.posix.normalize(path2.posix.join(path2.posix.dirname(sourceFile), specifier));
  const sourceExtension = path2.posix.extname(base);
  const extensionlessBase = sourceExtension ? base.slice(0, -sourceExtension.length) : base;
  const candidates = [
    base,
    ...resolutionExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtension ? resolutionExtensions.map((extension) => `${extensionlessBase}${extension}`) : []
  ];
  for (const extension of resolutionExtensions) candidates.push(path2.posix.join(base, `index${extension}`));
  return candidates.find((candidate) => fileSet.has(candidate));
}
function resolvePythonImport(sourceFile, specifier, fileSet, topLevelModules) {
  const isRelative = specifier.startsWith(".");
  const segments = specifier.split(".");
  let base;
  if (isRelative) {
    const dots = specifier.match(/^\.+/)?.[0].length ?? 1;
    const moduleParts = specifier.slice(dots).split(".").filter(Boolean);
    let directory = path2.posix.dirname(sourceFile);
    for (let level = 1; level < dots; level += 1) directory = path2.posix.dirname(directory);
    base = path2.posix.join(directory, ...moduleParts);
  } else {
    base = path2.posix.join(...segments);
  }
  const candidates = [`${base}.py`, path2.posix.join(base, "__init__.py")];
  const target = candidates.find((candidate) => fileSet.has(candidate));
  if (target) return { target, looksLocal: true };
  const first = segments.find(Boolean) ?? "";
  return { looksLocal: isRelative || topLevelModules.has(first) };
}
function stableId(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}
function buildArchitectureDependencyGraph(snapshot, profile) {
  const sourceFiles = snapshot.files.filter((file) => languageForFile(file) !== void 0).map((file) => file.replaceAll("\\", "/")).sort();
  const fileSet = new Set(sourceFiles);
  const sourceContent = snapshot.fileContents ?? {};
  const topLevelModules = new Set(sourceFiles.map((file) => file.split("/")[0]?.replace(/\.py$/, "") ?? ""));
  const packageFacts = [...detectRepositoryFacts(snapshot).packages ?? []].sort((left, right) => right.root.length - left.root.length);
  const packageForFile = (file) => packageFacts.find(
    (item) => item.root === "." || file === item.root || file.startsWith(`${item.root}/`)
  );
  const nodes = sourceFiles.map((file) => {
    const projectPackage = packageForFile(file);
    return {
      id: `FILE:${file}`,
      path: file,
      language: languageForFile(file) ?? "unknown",
      roles: mapRoles(file, profile?.componentMappings),
      ...projectPackage ? { packageId: projectPackage.id, packageRoot: projectPackage.root } : {}
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.path));
  const edges = [];
  const unresolvedRelativeImports = [];
  for (const sourceFile of sourceFiles) {
    const content = sourceContent[sourceFile];
    if (content === void 0) continue;
    const language = languageForFile(sourceFile);
    if (!language || !graphableLanguages.has(language)) continue;
    for (const item of importsForFile(sourceFile, content)) {
      let target;
      let looksLocal = false;
      if (language === "python") {
        const resolved = resolvePythonImport(sourceFile, item.specifier, fileSet, topLevelModules);
        target = resolved.target;
        looksLocal = resolved.looksLocal;
      } else {
        target = resolveTypeScriptImport(sourceFile, item.specifier, fileSet);
        looksLocal = item.specifier.startsWith(".") || item.specifier.startsWith("@/") || item.specifier.startsWith("~/") || item.specifier.startsWith("src/") || item.specifier.startsWith("app/") || item.specifier.startsWith("#");
      }
      if (!target) {
        if (looksLocal) unresolvedRelativeImports.push({
          file: sourceFile,
          line: item.line,
          specifier: item.specifier
        });
        continue;
      }
      if (!nodeIds.has(target)) continue;
      const evidenceRef = `EVD-ARCH-${stableId(`${sourceFile}:${item.line}:${item.specifier}:${target}`)}`;
      edges.push({
        id: `EDGE-${stableId(`${sourceFile}:${item.line}:${item.specifier}:${target}`)}`,
        sourceId: `FILE:${sourceFile}`,
        targetId: `FILE:${target}`,
        importSpecifier: item.specifier,
        sourceLocation: { file: sourceFile, line: item.line },
        evidenceRef,
        confidence: 0.9
      });
    }
  }
  const uninspectedSourceFiles = sourceFiles.filter((file) => {
    const language = languageForFile(file);
    return Boolean(language && graphableLanguages.has(language) && sourceContent[file] === void 0);
  }).sort();
  const unsupportedLanguages = [...new Set(
    sourceFiles.map((file) => languageForFile(file)).filter((language) => Boolean(language) && !graphableLanguages.has(language))
  )].sort();
  const componentFiles = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    for (const role of node.roles) {
      const filesForRole = componentFiles.get(role) ?? [];
      filesForRole.push(node.path);
      componentFiles.set(role, filesForRole);
    }
  }
  const components = [...componentFiles.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([role, filesForRole]) => ({
    id: `COMP:${role}`,
    role,
    files: [...filesForRole].sort()
  }));
  const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
  const ambiguousRoleMappings = nodes.filter(
    (node) => node.roles.length > 1 && !profile?.boundaryRules.some(
      (rule) => rule.allowed === true && [...roleAlternatives(rule.sourcePattern), ...roleAlternatives(rule.targetPattern)].some((role) => node.roles.includes(role))
    )
  ).map((node) => ({ file: node.path, roles: [...node.roles] })).sort((left, right) => left.file.localeCompare(right.file));
  const componentEdges = [];
  for (const edge of edges) {
    const source = nodeByPath.get(edge.sourceId.slice("FILE:".length));
    const target = nodeByPath.get(edge.targetId.slice("FILE:".length));
    for (const sourceRole of source?.roles ?? []) {
      for (const targetRole of target?.roles ?? []) {
        componentEdges.push({
          id: `COMPEDGE:${stableId(`${sourceRole}:${targetRole}:${edge.id}`)}`,
          sourceComponentId: `COMP:${sourceRole}`,
          targetComponentId: `COMP:${targetRole}`,
          sourceFile: source?.path ?? "",
          targetFile: target?.path ?? "",
          sourceLocation: edge.sourceLocation,
          evidenceRef: edge.evidenceRef
        });
      }
    }
  }
  const normalizedChangedFiles = [...new Set(
    (snapshot.changeScope?.status === "VERIFIED" ? snapshot.changeScope.files : snapshot.changedFiles).map((file) => file.replaceAll("\\", "/").replace(/^\.\//, ""))
  )].sort();
  const changeImpactLimitations = [];
  let changeImpactStatus = snapshot.changeScope?.status === "VERIFIED" ? "VERIFIED" : "NOT_REQUESTED";
  const changedComponents = /* @__PURE__ */ new Set();
  const impactedFileSet = /* @__PURE__ */ new Set();
  const unresolvedChangedFiles = [];
  const unmappedChangedFiles = [];
  if (snapshot.changeScope?.status === "UNVERIFIED") {
    changeImpactStatus = "UNVERIFIED";
    changeImpactLimitations.push(
      snapshot.changeScope.reason ?? "Changed-file scope could not be verified against Git."
    );
  } else if (normalizedChangedFiles.length > 0) {
    changeImpactStatus = snapshot.changeScope?.status === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
    if (changeImpactStatus === "UNVERIFIED") {
      changeImpactLimitations.push("Changed files were supplied without a verified Git change scope.");
    }
    const reverseFileDependencies = /* @__PURE__ */ new Map();
    for (const edge of edges) {
      const source = edge.sourceId.slice("FILE:".length);
      const target = edge.targetId.slice("FILE:".length);
      const dependents = reverseFileDependencies.get(target) ?? /* @__PURE__ */ new Set();
      dependents.add(source);
      reverseFileDependencies.set(target, dependents);
    }
    const queue = [];
    for (const changedFile of normalizedChangedFiles) {
      if (!fileSet.has(changedFile)) {
        if (languageForFile(changedFile)) unresolvedChangedFiles.push(changedFile);
        continue;
      }
      impactedFileSet.add(changedFile);
      queue.push(changedFile);
      const node = nodeByPath.get(changedFile);
      if (!node || node.roles.length === 0) unmappedChangedFiles.push(changedFile);
      for (const role of node?.roles ?? []) changedComponents.add(`COMP:${role}`);
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const changedDependency = queue[cursor];
      for (const dependent of reverseFileDependencies.get(changedDependency) ?? []) {
        if (impactedFileSet.has(dependent)) continue;
        impactedFileSet.add(dependent);
        queue.push(dependent);
      }
    }
    if (unresolvedChangedFiles.length > 0) {
      changeImpactStatus = "PARTIAL";
      changeImpactLimitations.push(
        `Changed source file(s) were not present in the inspected snapshot: ${unresolvedChangedFiles.join(", ")}.`
      );
    }
    if (unmappedChangedFiles.length > 0) {
      changeImpactStatus = "PARTIAL";
      changeImpactLimitations.push(
        `Changed source file(s) have no architecture role mapping: ${unmappedChangedFiles.join(", ")}.`
      );
    }
    if (graphableLanguages.size > 0 && uninspectedSourceFiles.length > 0) {
      changeImpactStatus = "PARTIAL";
      changeImpactLimitations.push(
        "Some source files were not inspected, so reverse-dependency impact may be incomplete."
      );
    }
  }
  const impactedComponents = /* @__PURE__ */ new Set();
  for (const file of impactedFileSet) {
    for (const role of nodeByPath.get(file)?.roles ?? []) impactedComponents.add(`COMP:${role}`);
  }
  const packageEdges = [];
  for (const edge of edges) {
    const source = nodeByPath.get(edge.sourceId.slice("FILE:".length));
    const target = nodeByPath.get(edge.targetId.slice("FILE:".length));
    if (!source?.packageId || !target?.packageId || source.packageId === target.packageId) continue;
    packageEdges.push({
      id: `PKGEDGE:${stableId(`${source.packageId}:${target.packageId}:${edge.id}`)}`,
      sourcePackageId: source.packageId,
      targetPackageId: target.packageId,
      sourceFile: source.path,
      targetFile: target.path,
      sourceLocation: edge.sourceLocation,
      evidenceRef: edge.evidenceRef
    });
  }
  const changeImpact = {
    status: changeImpactStatus,
    changedFiles: normalizedChangedFiles,
    changedComponents: [...changedComponents].sort(),
    impactedFiles: [...impactedFileSet].sort(),
    impactedComponents: [...impactedComponents].sort(),
    unmappedChangedFiles: [...new Set(unmappedChangedFiles)].sort(),
    unresolvedChangedFiles: [...new Set(unresolvedChangedFiles)].sort(),
    limitations: [...new Set(changeImpactLimitations)].sort()
  };
  return {
    nodes,
    edges: edges.sort(
      (a, b) => a.sourceId.localeCompare(b.sourceId) || a.sourceLocation.line - b.sourceLocation.line || a.targetId.localeCompare(b.targetId)
    ),
    components,
    componentEdges: componentEdges.sort(
      (a, b) => a.sourceComponentId.localeCompare(b.sourceComponentId) || a.targetComponentId.localeCompare(b.targetComponentId) || a.sourceFile.localeCompare(b.sourceFile)
    ),
    packageEdges: packageEdges.sort(
      (a, b) => a.sourcePackageId.localeCompare(b.sourcePackageId) || a.targetPackageId.localeCompare(b.targetPackageId) || a.sourceFile.localeCompare(b.sourceFile)
    ),
    changeImpact,
    ambiguousRoleMappings,
    unresolvedRelativeImports: unresolvedRelativeImports.sort(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line
    ),
    uninspectedSourceFiles,
    unsupportedLanguages
  };
}
function roleAlternatives(pattern) {
  return pattern ? pattern.split("|").map((role) => role.trim()).filter(Boolean) : [];
}
function verifyArchitectureProfile(snapshot, profile) {
  const graph = buildArchitectureDependencyGraph(snapshot, profile);
  const limitations = [];
  const unsupportedCapabilities = [];
  const supportedCapabilities = ["dependency-graph:typescript", "dependency-graph:javascript", "dependency-graph:python"];
  const evidence = [];
  const findings = [];
  const nodeByPath = new Map(graph.nodes.map((node) => [node.path, node]));
  if (!profile.componentMappings || Object.keys(profile.componentMappings).length === 0) {
    limitations.push("The profile has no componentMappings; declared boundary rules cannot be checked against repository paths.");
    unsupportedCapabilities.push("architecture:component-role-mapping");
  }
  if (graph.unsupportedLanguages.length > 0) {
    limitations.push(`Dependency graph extraction is not implemented for: ${graph.unsupportedLanguages.join(", ")}.`);
    unsupportedCapabilities.push(...graph.unsupportedLanguages.map((language) => `architecture:dependency-graph:${language}`));
  }
  if (graph.uninspectedSourceFiles.length > 0) {
    limitations.push(`${graph.uninspectedSourceFiles.length} source file(s) were not inspected for dependencies.`);
    unsupportedCapabilities.push("architecture:source-content");
  }
  if (graph.ambiguousRoleMappings.length > 0) {
    limitations.push(
      `${graph.ambiguousRoleMappings.length} source file(s) match multiple architecture roles; boundary verification may be ambiguous.`
    );
    unsupportedCapabilities.push("architecture:unambiguous-component-mapping");
  }
  if (snapshot.contentLimitations?.length) {
    limitations.push(...snapshot.contentLimitations);
    unsupportedCapabilities.push("repository:content-limits");
  }
  if (graph.unresolvedRelativeImports.length > 0) {
    limitations.push(`${graph.unresolvedRelativeImports.length} local import(s) could not be resolved; boundary verification may be incomplete.`);
    unsupportedCapabilities.push("architecture:resolve-local-imports");
  }
  for (const edge of graph.edges) {
    evidence.push({
      id: edge.evidenceRef,
      type: "E3_AUTOMATED_ANALYSIS",
      status: "VERIFIED",
      description: `Static import edge ${edge.sourceId} -> ${edge.targetId} was extracted from source code.`,
      source: `${edge.sourceLocation.file}:${edge.sourceLocation.line}`,
      freshness: "current",
      supports_controls: []
    });
  }
  let unverifiedRules = 0;
  const allowedRules = profile.boundaryRules.filter((rule) => rule.allowed === true);
  for (const rule of allowedRules) {
    const sourceRoles = roleAlternatives(rule.sourcePattern);
    const targetRoles = roleAlternatives(rule.targetPattern);
    if (sourceRoles.length === 0 || targetRoles.length === 0) {
      unverifiedRules += 1;
      limitations.push(`Allowed dependency rule ${rule.id} is missing a sourcePattern or targetPattern and cannot act as an exception.`);
      continue;
    }
    const matchingSources = graph.nodes.some((node) => node.roles.some((role) => sourceRoles.includes(role)));
    const matchingTargets = graph.nodes.some((node) => node.roles.some((role) => targetRoles.includes(role)));
    if (!matchingSources || !matchingTargets) {
      unverifiedRules += 1;
      limitations.push(`Allowed dependency rule ${rule.id} could not be verified because its source or target role has no matched files.`);
    }
  }
  for (const rule of profile.boundaryRules) {
    if (rule.allowed === true) continue;
    const sourceRoles = roleAlternatives(rule.sourcePattern);
    const targetRoles = roleAlternatives(rule.targetPattern);
    if (sourceRoles.length === 0 || targetRoles.length === 0) {
      unverifiedRules += 1;
      limitations.push(`Boundary rule ${rule.id} is missing a sourcePattern or targetPattern.`);
      continue;
    }
    const matchingSources = graph.nodes.filter((node) => node.roles.some((role) => sourceRoles.includes(role)));
    const matchingTargets = graph.nodes.filter((node) => node.roles.some((role) => targetRoles.includes(role)));
    if (matchingSources.length === 0 || matchingTargets.length === 0) {
      unverifiedRules += 1;
      limitations.push(`Boundary rule ${rule.id} could not be verified because a mapped source or target role has no matched files.`);
      continue;
    }
    for (const edge of graph.edges) {
      const source = nodeByPath.get(edge.sourceId.slice("FILE:".length));
      const target = nodeByPath.get(edge.targetId.slice("FILE:".length));
      if (source?.roles.some((role) => sourceRoles.includes(role)) && target?.roles.some((role) => targetRoles.includes(role))) {
        const explicitlyAllowed = allowedRules.some((allowRule) => {
          const allowedSourceRoles = roleAlternatives(allowRule.sourcePattern);
          const allowedTargetRoles = roleAlternatives(allowRule.targetPattern);
          return source.roles.some((role) => allowedSourceRoles.includes(role)) && target.roles.some((role) => allowedTargetRoles.includes(role));
        });
        if (explicitlyAllowed) continue;
        const componentId = source.roles.find((role) => sourceRoles.includes(role));
        findings.push({
          id: `FND-ARCH-${stableId(`${rule.id}:${edge.id}`)}`,
          rule_id: rule.id,
          severity: rule.severity,
          category: "architecture-boundary",
          message: `${rule.description} Found dependency ${source.path} -> ${target.path}.`,
          status: "OPEN",
          evidence_refs: [edge.evidenceRef],
          source_location: {
            file: edge.sourceLocation.file,
            start_line: edge.sourceLocation.line
          },
          ...componentId ? { component_id: componentId } : {},
          confidence: edge.confidence,
          remediation: `Remove or invert the dependency from ${source.path} to ${target.path}.`
        });
      }
    }
  }
  if (unverifiedRules > 0) unsupportedCapabilities.push("architecture:boundary-rule-verification");
  if (findings.length > 0) {
  }
  const status = unsupportedCapabilities.length > 0 || unverifiedRules > 0 ? "PARTIAL" : "COMPLETE";
  return {
    profileId: profile.id,
    status,
    graph,
    evidence,
    findings,
    limitations: [...new Set(limitations)],
    supportedCapabilities,
    unsupportedCapabilities: [...new Set(unsupportedCapabilities)].sort()
  };
}

// ../engine/src/evidence-policy.ts
var TOOL_RESULT_STATUSES = [
  "PASS",
  "WARN",
  "FAIL",
  "SKIPPED",
  "UNSUPPORTED",
  "UNVERIFIED",
  "ERROR"
];
var EVIDENCE_STATUS_FOR_RESULT = {
  PASS: "VERIFIED",
  WARN: "PARTIALLY_VERIFIED",
  FAIL: "UNVERIFIED",
  SKIPPED: "UNVERIFIED",
  UNSUPPORTED: "UNVERIFIED",
  UNVERIFIED: "UNVERIFIED",
  ERROR: "UNVERIFIED"
};
var evidenceStatusForResult = (result) => EVIDENCE_STATUS_FOR_RESULT[result];
var strength = {
  VERIFIED: 2,
  PARTIALLY_VERIFIED: 1,
  UNVERIFIED: 0,
  NOT_APPLICABLE: 0
};
function overstatesToolResult(claimed, result) {
  return strength[claimed] > strength[evidenceStatusForResult(result)];
}

// ../engine/src/validation.ts
function duplicateIdIssues(collectionName, items) {
  const seen = /* @__PURE__ */ new Set();
  const issues = [];
  items.forEach((item, index) => {
    if (seen.has(item.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        path: `/${collectionName}/${index}/id`,
        message: `Duplicate ID '${item.id}' in ${collectionName}.`
      });
    }
    seen.add(item.id);
  });
  return issues;
}
function validateGovernancePackSemantics(pack, evaluatedAt) {
  const issues = [];
  const collections = [
    ["standards", pack.standards],
    ["controls", pack.controls],
    ["evidence", pack.evidence],
    ["risks", pack.risks],
    ["decisions", pack.decisions],
    ["findings", pack.findings ?? []],
    ["exceptions", pack.exceptions ?? []],
    ["debt", pack.debt ?? []]
  ];
  for (const [name, items] of collections) {
    issues.push(...duplicateIdIssues(name, items));
  }
  const standardIds = new Set(pack.standards.map((item) => item.id));
  const controlIds = new Set(pack.controls.map((item) => item.id));
  const evidenceIds = new Set(pack.evidence.map((item) => item.id));
  pack.risks.forEach((risk, index) => {
    if (risk.status === "ACCEPTED") {
      const complete = Boolean(risk.accepted_by?.trim()) && Boolean(risk.acceptance_reason?.trim()) && Boolean(risk.accepted_at) && Boolean(risk.acceptance_expires_at) && !Number.isNaN(Date.parse(risk.accepted_at ?? "")) && !Number.isNaN(Date.parse(risk.acceptance_expires_at ?? "")) && Date.parse(risk.accepted_at ?? "") < Date.parse(risk.acceptance_expires_at ?? "");
      if (!complete) {
        issues.push({
          code: "INVALID_RISK_ACCEPTANCE",
          path: `/risks/${index}`,
          message: `Accepted risk '${risk.id}' must include accepted_by, accepted_at, and acceptance_reason.`
        });
      } else if (evaluatedAt && (Date.parse(risk.accepted_at) > Date.parse(evaluatedAt) || Date.parse(risk.acceptance_expires_at) <= Date.parse(evaluatedAt))) {
        issues.push({
          code: "INVALID_RISK_ACCEPTANCE",
          path: `/risks/${index}`,
          message: `Risk '${risk.id}' acceptance is not valid at the evaluation timestamp.`
        });
      }
    }
  });
  pack.controls.forEach((control, index) => {
    if (!standardIds.has(control.standard)) {
      issues.push({
        code: "UNKNOWN_STANDARD",
        path: `/controls/${index}/standard`,
        message: `Control '${control.id}' references unknown standard '${control.standard}'.`
      });
    }
    for (const evidenceId of control.required_evidence ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: "UNKNOWN_EVIDENCE",
          path: `/controls/${index}/required_evidence`,
          message: `Control '${control.id}' requires unknown evidence '${evidenceId}'.`
        });
      }
    }
  });
  pack.evidence.forEach((item, index) => {
    if (item.result_status !== void 0) {
      if (!(item.result_status in EVIDENCE_STATUS_FOR_RESULT)) {
        issues.push({
          code: "UNKNOWN_RESULT_STATUS",
          path: `/evidence/${index}/result_status`,
          message: `Evidence '${item.id}' has unknown tool result status '${String(item.result_status)}'.`
        });
      } else if (overstatesToolResult(item.status, item.result_status)) {
        issues.push({
          code: "EVIDENCE_STATUS_OVERSTATED",
          path: `/evidence/${index}/status`,
          message: `Evidence '${item.id}' claims status ${item.status}, but its tool result ${item.result_status} supports at most ${EVIDENCE_STATUS_FOR_RESULT[item.result_status]}.`
        });
      }
    }
    for (const controlId of item.supports_controls) {
      if (!controlIds.has(controlId)) {
        issues.push({
          code: "UNKNOWN_CONTROL",
          path: `/evidence/${index}/supports_controls`,
          message: `Evidence '${item.id}' references unknown control '${controlId}'.`
        });
      }
    }
  });
  pack.decisions.forEach((decision, index) => {
    for (const evidenceId of decision.evidence ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: "UNKNOWN_EVIDENCE",
          path: `/decisions/${index}/evidence`,
          message: `Decision '${decision.id}' references unknown evidence '${evidenceId}'.`
        });
      }
    }
  });
  (pack.findings ?? []).forEach((finding, index) => {
    for (const evidenceId of finding.evidence_refs) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          code: "UNKNOWN_EVIDENCE",
          path: `/findings/${index}/evidence_refs`,
          message: `Finding '${finding.id}' references unknown evidence '${evidenceId}'.`
        });
      }
    }
  });
  (pack.exceptions ?? []).forEach((exception, index) => {
    if (exception.control && !controlIds.has(exception.control)) {
      issues.push({
        code: "UNKNOWN_CONTROL",
        path: `/exceptions/${index}/control`,
        message: `Exception '${exception.id}' references unknown control '${exception.control}'.`
      });
    }
    if (exception.status === "REQUESTED" || exception.status === "APPROVED") {
      const hasRequestMetadata = Boolean(exception.control?.trim()) && Boolean(exception.reason?.trim()) && Boolean(exception.project_id?.trim()) && Boolean(exception.change_id?.trim()) && Boolean(exception.requested_by?.trim()) && Boolean(exception.requested_at) && !Number.isNaN(Date.parse(exception.requested_at ?? ""));
      const hasApprovalMetadata = exception.status !== "APPROVED" || Boolean(exception.approved_by?.trim()) && Boolean(exception.approved_at) && !Number.isNaN(Date.parse(exception.approved_at ?? "")) && Boolean(exception.expires_at) && !Number.isNaN(Date.parse(exception.expires_at ?? ""));
      if (!hasRequestMetadata || !hasApprovalMetadata) {
        issues.push({
          code: "INVALID_EXCEPTION",
          path: `/exceptions/${index}`,
          message: `Exception '${exception.id}' is missing required request or approval metadata.`
        });
      }
      if (exception.status === "APPROVED" && (exception.project_id !== pack.project.id || exception.change_id !== pack.change.id)) {
        issues.push({
          code: "INVALID_EXCEPTION",
          path: `/exceptions/${index}`,
          message: `Approved exception '${exception.id}' is outside the current project/change scope.`
        });
      }
      if (exception.status === "APPROVED" && exception.approved_at && exception.expires_at) {
        const approvedAt = Date.parse(exception.approved_at);
        const expiresAt = Date.parse(exception.expires_at);
        const evaluationTime = evaluatedAt ? Date.parse(evaluatedAt) : Number.NaN;
        if (approvedAt >= expiresAt || evaluatedAt && (Number.isNaN(evaluationTime) || expiresAt <= evaluationTime)) {
          issues.push({
            code: "INVALID_EXCEPTION",
            path: `/exceptions/${index}/expires_at`,
            message: `Approved exception '${exception.id}' has an invalid or expired time window.`
          });
        }
      }
    }
  });
  return issues;
}

// ../model/governance-model.schema.json
var governance_model_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/Inflame21/engineering-governance/blob/main/22-governance-operations/model/governance-model.schema.json",
  title: "Engineering Governance Model",
  description: "Canonical machine-readable model for evaluating engineering changes against governance standards.",
  type: "object",
  required: [
    "version",
    "project",
    "change",
    "standards",
    "controls",
    "evidence",
    "risks",
    "decisions"
  ],
  properties: {
    version: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    project: {
      $ref: "#/$defs/project"
    },
    change: {
      $ref: "#/$defs/change"
    },
    standards: {
      type: "array",
      items: {
        $ref: "#/$defs/standard"
      }
    },
    controls: {
      type: "array",
      items: {
        $ref: "#/$defs/control"
      }
    },
    evidence: {
      type: "array",
      items: {
        $ref: "#/$defs/evidence"
      }
    },
    risks: {
      type: "array",
      items: {
        $ref: "#/$defs/risk"
      }
    },
    decisions: {
      type: "array",
      items: {
        $ref: "#/$defs/decision"
      }
    },
    exceptions: {
      type: "array",
      items: {
        $ref: "#/$defs/exception"
      },
      default: []
    },
    debt: {
      type: "array",
      items: {
        $ref: "#/$defs/debt"
      },
      default: []
    },
    findings: {
      type: "array",
      items: {
        $ref: "#/$defs/finding"
      }
    }
  },
  $defs: {
    project: {
      type: "object",
      required: [
        "id",
        "name",
        "repository",
        "environment"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^[a-z0-9][a-z0-9._-]*$"
        },
        name: {
          type: "string",
          minLength: 1
        },
        repository: {
          type: "string"
        },
        environment: {
          type: "string"
        }
      },
      additionalProperties: false
    },
    change: {
      type: "object",
      required: [
        "id",
        "type",
        "title",
        "risk_class",
        "files"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^CHG-[0-9A-Z-]+$"
        },
        type: {
          enum: [
            "feature",
            "bugfix",
            "refactor",
            "security",
            "database",
            "infrastructure",
            "configuration",
            "release",
            "emergency"
          ]
        },
        title: {
          type: "string",
          minLength: 1
        },
        description: {
          type: "string"
        },
        author: {
          type: "string"
        },
        risk_class: {
          enum: [
            "A",
            "B",
            "C",
            "D"
          ]
        },
        files: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Declared changed-file set. When a Git diff is verified, this set must exactly match the actual changed paths."
        }
      },
      additionalProperties: false
    },
    standard: {
      type: "object",
      required: [
        "id",
        "title",
        "version",
        "source"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^[A-Z]{2,6}-\\d{3}$"
        },
        title: {
          type: "string"
        },
        version: {
          type: "string"
        },
        source: {
          type: "string"
        }
      },
      additionalProperties: false
    },
    control: {
      type: "object",
      required: [
        "id",
        "standard",
        "title",
        "severity"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^[A-Z0-9-]+$"
        },
        standard: {
          type: "string"
        },
        title: {
          type: "string"
        },
        severity: {
          enum: [
            "P0",
            "P1",
            "P2",
            "P3"
          ]
        },
        status: {
          enum: [
            "PASS",
            "FAIL",
            "WARN",
            "NOT_APPLICABLE",
            "UNVERIFIED"
          ],
          description: "Declared status. Informational only: the engine derives status from linked evidence and never trusts this value."
        },
        applies_when: {
          oneOf: [
            {
              type: "string"
            },
            {
              type: "array",
              items: {
                type: "string"
              }
            }
          ]
        },
        required_evidence: {
          type: "array",
          items: {
            type: "string"
          }
        },
        failure_decision: {
          enum: [
            "NO-GO",
            "GO_WITH_CONDITIONS",
            "REVIEW_REQUIRED",
            "NONE"
          ]
        },
        message: {
          type: "string"
        },
        max_evidence_age_seconds: {
          type: "integer",
          minimum: 0
        }
      },
      additionalProperties: false
    },
    evidence: {
      type: "object",
      required: [
        "id",
        "type",
        "status",
        "description",
        "source",
        "freshness",
        "supports_controls"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^EVD-[0-9A-Z-]+$"
        },
        type: {
          enum: [
            "E1_DIRECT_VERIFICATION",
            "E2_INSPECTION",
            "E3_AUTOMATED_ANALYSIS",
            "E4_OPERATIONAL",
            "E5_DOCUMENTARY",
            "E6_ASSERTION"
          ]
        },
        status: {
          enum: [
            "VERIFIED",
            "PARTIALLY_VERIFIED",
            "UNVERIFIED",
            "NOT_APPLICABLE"
          ]
        },
        description: {
          type: "string"
        },
        source: {
          type: "string",
          pattern: "\\S",
          description: "Where the evidence comes from. Blank sources are treated as missing evidence."
        },
        freshness: {
          type: "string",
          minLength: 1,
          description: "Only the exact value 'current' is accepted as fresh; any other value is treated as stale."
        },
        supports_controls: {
          type: "array",
          items: {
            type: "string"
          }
        },
        result_status: {
          type: "string",
          description: "The tool's own result. Only PASS can support VERIFIED and WARN PARTIALLY_VERIFIED; every other result supports at most UNVERIFIED. The engine rejects evidence whose status is stronger than its result allows.",
          enum: ["PASS", "WARN", "FAIL", "SKIPPED", "UNSUPPORTED", "UNVERIFIED", "ERROR"]
        },
        tool_version: {
          type: "string",
          minLength: 1
        },
        generated_at: {
          type: "string",
          format: "date-time"
        },
        repository_fingerprint: {
          type: "string",
          pattern: "^sha256:[0-9a-f]{64}$"
        },
        duration_ms: {
          type: "integer",
          minimum: 0
        },
        exit_code: {
          type: "integer"
        },
        command: {
          type: "array",
          items: {
            type: "string"
          }
        },
        freshness_status: {
          enum: [
            "current",
            "stale",
            "expired",
            "unknown"
          ]
        }
      },
      additionalProperties: false
    },
    risk: {
      type: "object",
      required: [
        "id",
        "severity",
        "title",
        "status"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^RSK-[0-9A-Z-]+$"
        },
        severity: {
          enum: [
            "P0",
            "P1",
            "P2",
            "P3"
          ]
        },
        title: {
          type: "string"
        },
        status: {
          enum: [
            "OPEN",
            "MITIGATED",
            "ACCEPTED",
            "CLOSED"
          ]
        },
        mitigation: {
          type: "string"
        },
        owner: {
          type: "string"
        },
        accepted_by: {
          type: "string",
          minLength: 1
        },
        accepted_at: {
          type: "string",
          format: "date-time"
        },
        acceptance_reason: {
          type: "string",
          minLength: 1
        },
        acceptance_role: {
          type: "string",
          description: "The authority role under which accepted_by accepted the risk (EXC-021 section 15). A P1 acceptance holds only when this names an approved role that covers P1 and accepted_by holds it.",
          pattern: "^[A-Z][A-Z0-9_]*$"
        },
        acceptance_expires_at: {
          type: "string",
          format: "date-time"
        }
      },
      additionalProperties: false,
      allOf: [
        {
          if: {
            properties: {
              status: {
                const: "ACCEPTED"
              }
            },
            required: [
              "status"
            ]
          },
          then: {
            required: [
              "accepted_by",
              "accepted_at",
              "acceptance_expires_at",
              "acceptance_reason"
            ],
            properties: {
              accepted_by: {
                type: "string",
                minLength: 1
              },
              accepted_at: {
                type: "string",
                format: "date-time"
              },
              acceptance_expires_at: {
                type: "string",
                format: "date-time"
              },
              acceptance_reason: {
                type: "string",
                minLength: 1
              }
            }
          }
        }
      ]
    },
    decision: {
      type: "object",
      required: [
        "id",
        "type",
        "status"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^DEC-[0-9A-Z-]+$"
        },
        type: {
          enum: [
            "READINESS",
            "REVIEW",
            "RELEASE",
            "PRODUCTION"
          ]
        },
        status: {
          enum: [
            "READY",
            "READY_WITH_CONDITIONS",
            "NOT_READY",
            "APPROVE",
            "APPROVE_WITH_CONDITIONS",
            "REQUEST_CHANGES",
            "REJECT",
            "GO",
            "GO_WITH_CONDITIONS",
            "NO-GO"
          ]
        },
        reason: {
          type: "string"
        },
        evidence: {
          type: "array",
          items: {
            type: "string"
          }
        },
        owner: {
          type: "string"
        },
        timestamp: {
          type: "string",
          format: "date-time"
        }
      },
      additionalProperties: false
    },
    exception: {
      type: "object",
      required: [
        "id",
        "status"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^EXC-[0-9A-Z-]+$"
        },
        status: {
          enum: [
            "REQUESTED",
            "APPROVED",
            "REJECTED",
            "EXPIRED",
            "CLOSED"
          ]
        },
        control: {
          type: "string",
          minLength: 1
        },
        reason: {
          type: "string",
          minLength: 1
        },
        expires_at: {
          type: "string",
          format: "date-time"
        },
        project_id: {
          type: "string",
          minLength: 1
        },
        change_id: {
          type: "string",
          pattern: "^CHG-[0-9A-Z-]+$"
        },
        requested_by: {
          type: "string",
          minLength: 1
        },
        requested_at: {
          type: "string",
          format: "date-time"
        },
        approved_by: {
          type: "string",
          minLength: 1
        },
        approver_role: {
          type: "string",
          description: "The authority role under which approved_by approved the exception (EXC-021 section 15). Checked against the approved authority policy; required for the waiver to hold once a policy is in force.",
          pattern: "^[A-Z][A-Z0-9_]*$"
        },
        approved_at: {
          type: "string",
          format: "date-time"
        },
        approval_signature: {
          type: "string",
          description: "Repository-relative path of a detached, ASCII-armored GPG signature over the canonical approval payload. The CLI verifies it against the approver's registered key when asked to (check --verify-signatures).",
          minLength: 1
        }
      },
      additionalProperties: false,
      allOf: [
        {
          if: {
            properties: {
              status: {
                const: "REQUESTED"
              }
            },
            required: [
              "status"
            ]
          },
          then: {
            required: [
              "control",
              "reason",
              "project_id",
              "change_id",
              "requested_by",
              "requested_at"
            ],
            properties: {
              control: {
                type: "string",
                minLength: 1
              },
              reason: {
                type: "string",
                minLength: 1
              },
              project_id: {
                type: "string",
                minLength: 1
              },
              change_id: {
                type: "string",
                pattern: "^CHG-[0-9A-Z-]+$"
              },
              requested_by: {
                type: "string",
                minLength: 1
              },
              requested_at: {
                type: "string",
                format: "date-time"
              }
            }
          }
        },
        {
          if: {
            properties: {
              status: {
                const: "APPROVED"
              }
            },
            required: [
              "status"
            ]
          },
          then: {
            required: [
              "control",
              "reason",
              "project_id",
              "change_id",
              "requested_by",
              "requested_at",
              "approved_by",
              "approved_at",
              "expires_at"
            ],
            properties: {
              control: {
                type: "string",
                minLength: 1
              },
              reason: {
                type: "string",
                minLength: 1
              },
              project_id: {
                type: "string",
                minLength: 1
              },
              change_id: {
                type: "string",
                pattern: "^CHG-[0-9A-Z-]+$"
              },
              requested_by: {
                type: "string",
                minLength: 1
              },
              requested_at: {
                type: "string",
                format: "date-time"
              },
              approved_by: {
                type: "string",
                minLength: 1
              },
              approved_at: {
                type: "string",
                format: "date-time"
              },
              expires_at: {
                type: "string",
                format: "date-time"
              }
            }
          }
        }
      ]
    },
    debt: {
      type: "object",
      required: [
        "id",
        "severity",
        "status"
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^DEBT-[0-9A-Z-]+$"
        },
        severity: {
          enum: [
            "P0",
            "P1",
            "P2",
            "P3"
          ]
        },
        status: {
          enum: [
            "OPEN",
            "PLANNED",
            "IN_PROGRESS",
            "ACCEPTED",
            "RESOLVED"
          ]
        },
        title: {
          type: "string"
        },
        owner: {
          type: "string"
        }
      },
      additionalProperties: false
    },
    finding: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "rule_id",
        "severity",
        "category",
        "message",
        "status",
        "evidence_refs"
      ],
      properties: {
        id: {
          type: "string",
          minLength: 1
        },
        rule_id: {
          type: "string",
          minLength: 1
        },
        severity: {
          enum: [
            "P0",
            "P1",
            "P2",
            "P3"
          ]
        },
        category: {
          type: "string",
          minLength: 1
        },
        message: {
          type: "string",
          minLength: 1
        },
        status: {
          enum: [
            "OPEN",
            "ACKNOWLEDGED",
            "IN_PROGRESS",
            "RESOLVED",
            "ACCEPTED",
            "SUPPRESSED",
            "UNVERIFIED"
          ]
        },
        evidence_refs: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "string",
            minLength: 1
          }
        },
        source_location: {
          type: "object",
          additionalProperties: false,
          required: [
            "file"
          ],
          properties: {
            file: {
              type: "string",
              minLength: 1
            },
            start_line: {
              type: "integer",
              minimum: 1
            },
            end_line: {
              type: "integer",
              minimum: 1
            },
            start_column: {
              type: "integer",
              minimum: 1
            },
            end_column: {
              type: "integer",
              minimum: 1
            }
          }
        },
        component_id: {
          type: "string",
          minLength: 1
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1
        },
        remediation: {
          type: "string",
          minLength: 1
        }
      }
    }
  }
};

// ../model/architecture-profile.schema.json
var architecture_profile_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://engineering-governance.dev/schemas/architecture-profile.schema.json",
  title: "Engineering Governance Architecture Profile",
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "version",
    "name",
    "styles",
    "boundaryRules",
    "requiredControls"
  ],
  properties: {
    id: {
      type: "string",
      pattern: "^[a-z][a-z0-9-]*$"
    },
    version: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    name: {
      type: "string",
      minLength: 1
    },
    description: {
      type: "string"
    },
    styles: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: {
        type: "string",
        minLength: 1
      }
    },
    boundaryRules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "description",
          "severity"
        ],
        properties: {
          id: {
            type: "string",
            minLength: 1,
            pattern: "^[A-Z0-9][A-Z0-9-]*$"
          },
          description: {
            type: "string",
            minLength: 1
          },
          severity: {
            enum: [
              "P0",
              "P1",
              "P2",
              "P3"
            ]
          },
          sourcePattern: {
            type: "string",
            minLength: 1
          },
          targetPattern: {
            type: "string",
            minLength: 1
          },
          allowed: {
            type: "boolean",
            default: false
          }
        }
      }
    },
    requiredControls: {
      type: "array",
      uniqueItems: true,
      items: {
        type: "string",
        minLength: 1
      }
    },
    capabilities: {
      type: "array",
      uniqueItems: true,
      items: {
        type: "string",
        minLength: 1
      }
    },
    metadata: {
      type: "object"
    },
    componentMappings: {
      type: "object",
      description: "Maps architecture roles to repository-relative glob patterns.",
      additionalProperties: {
        type: "array",
        minItems: 1,
        items: {
          type: "string",
          minLength: 1
        }
      }
    }
  }
};

// ../model/project-registration.schema.json
var project_registration_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/Inflame21/engineering-governance/blob/main/22-governance-operations/model/project-registration.schema.json",
  title: "Engineering Governance Project Registration",
  description: "One record per governed project: identity, repositories, accountable owners, risk attributes and the approved architecture and technology profiles. Proposed in the operating blueprint (GOV-F09).",
  type: "object",
  required: [
    "version",
    "id",
    "name",
    "status",
    "criticality",
    "data_classification",
    "repositories",
    "owners",
    "environments",
    "profiles"
  ],
  properties: {
    version: {
      type: "string",
      description: "Version of this registration schema the record conforms to.",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    id: {
      type: "string",
      description: "Stable project identifier; matches project.id in the project's governance pack.",
      pattern: "^[a-z0-9][a-z0-9._-]*$"
    },
    name: {
      type: "string",
      minLength: 1
    },
    status: {
      type: "string",
      description: "ONBOARDING projects may have unassigned owners (an explicit ownership gap). ACTIVE projects must name a technical owner and governance representative.",
      enum: ["ONBOARDING", "ACTIVE", "RETIRED"]
    },
    criticality: {
      type: "string",
      description: "Business criticality, used to scale enforcement and audit frequency.",
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    },
    data_classification: {
      type: "string",
      enum: ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]
    },
    repositories: {
      type: "array",
      description: "Repositories that belong to this project. A repository may belong to only one registered project.",
      minItems: 1,
      uniqueItems: true,
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            description: "owner/repository",
            pattern: "^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$"
          },
          default_branch: {
            type: "string",
            minLength: 1
          }
        },
        additionalProperties: false
      }
    },
    owners: {
      type: "object",
      description: "Accountable people. Use the name UNASSIGNED as an explicit placeholder; it is never accepted for an ACTIVE project's technical owner or governance representative.",
      required: ["technical_owner", "governance_representative", "escalation_contact"],
      properties: {
        technical_owner: { $ref: "#/$defs/contact" },
        governance_representative: { $ref: "#/$defs/contact" },
        escalation_contact: { $ref: "#/$defs/contact" },
        remediation_owner: { $ref: "#/$defs/contact" }
      },
      additionalProperties: false
    },
    environments: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: {
        type: "string",
        pattern: "^[a-z][a-z0-9-]*$"
      }
    },
    profiles: {
      type: "object",
      required: ["architecture", "technology"],
      properties: {
        architecture: {
          type: "string",
          description: "Approved architecture profile id; must match a profile in model/architecture-profile-*.json.",
          pattern: "^[a-z0-9][a-z0-9-]*$"
        },
        technology: {
          type: "array",
          description: "Technology profile tags, for example typescript or python-fastapi.",
          minItems: 1,
          uniqueItems: true,
          items: {
            type: "string",
            pattern: "^[a-z0-9][a-z0-9.+-]*$"
          }
        }
      },
      additionalProperties: false
    },
    governance_pack: {
      type: "string",
      description: "Repository-relative path to the project's governance pack.",
      minLength: 1,
      default: ".governance/governance-pack.json"
    },
    governance_baseline: {
      type: "string",
      description: "Pinned tag or commit of the governance baseline the project consumes.",
      minLength: 1
    }
  },
  allOf: [
    {
      if: {
        properties: { status: { const: "ACTIVE" } },
        required: ["status"]
      },
      then: {
        properties: {
          owners: {
            type: "object",
            properties: {
              technical_owner: {
                type: "object",
                properties: { name: { type: "string", not: { const: "UNASSIGNED" } } }
              },
              governance_representative: {
                type: "object",
                properties: { name: { type: "string", not: { const: "UNASSIGNED" } } }
              }
            }
          }
        }
      }
    }
  ],
  $defs: {
    contact: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          minLength: 1
        },
        handle: {
          type: "string",
          description: "Source-control handle, for example a GitHub username.",
          pattern: "^@?[A-Za-z0-9][A-Za-z0-9-]*$"
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

// ../model/control-catalog.schema.json
var control_catalog_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/Inflame21/engineering-governance/blob/main/22-governance-operations/model/control-catalog.schema.json",
  title: "Engineering Governance Control Catalog",
  description: "Versioned catalog of mandatory controls, each traced to the exact standard text that requires it. Proposed in the operating blueprint (Release 2, Appendix B).",
  type: "object",
  required: ["version", "catalog_id", "catalog_version", "description", "controls"],
  properties: {
    version: {
      type: "string",
      description: "Version of this catalog schema the file conforms to.",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    catalog_id: {
      type: "string",
      pattern: "^[a-z0-9][a-z0-9-]*$"
    },
    catalog_version: {
      type: "string",
      description: "Version of this catalog's content.",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    description: {
      type: "string",
      minLength: 1
    },
    controls: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/control" }
    }
  },
  additionalProperties: false,
  $defs: {
    control: {
      type: "object",
      required: [
        "id",
        "standard_id",
        "standard_version",
        "source_file",
        "source_section",
        "source_text",
        "title",
        "description",
        "mandatory",
        "severity",
        "failure_decision",
        "verification_capabilities",
        "required_evidence_classes",
        "exception_policy",
        "owner",
        "status"
      ],
      properties: {
        id: {
          type: "string",
          description: "Stable identifier. A governance pack defines the control under this same id.",
          pattern: "^[A-Z0-9-]+$"
        },
        standard_id: {
          type: "string",
          pattern: "^[A-Z]{2,6}-\\d{3}$"
        },
        standard_version: {
          type: "string",
          description: "Version of the standard the control is defined against, or the word unversioned when the standard states none.",
          minLength: 1
        },
        source_file: {
          type: "string",
          description: "Repository-relative path of the standard.",
          minLength: 1
        },
        source_section: {
          type: "string",
          description: "Heading of the section that requires the control.",
          minLength: 1
        },
        source_text: {
          type: "string",
          description: "The requirement, quoted verbatim from the section. A test verifies it still exists there.",
          minLength: 1
        },
        title: { type: "string", minLength: 1 },
        description: { type: "string", minLength: 1 },
        mandatory: {
          type: "boolean",
          description: "Whether failure can block a gate."
        },
        severity: {
          enum: ["P0", "P1", "P2", "P3"]
        },
        failure_decision: {
          enum: ["NO-GO", "GO_WITH_CONDITIONS", "REVIEW_REQUIRED", "NONE"]
        },
        applies_when: {
          description: "Normalized signals under which the control applies. Empty or absent means always.",
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } }
          ]
        },
        verification_capabilities: {
          type: "array",
          description: "Checks or adapters able to verify the control. Empty means no automated verifier exists yet.",
          items: { type: "string", minLength: 1 },
          uniqueItems: true
        },
        required_evidence_classes: {
          type: "array",
          description: "GOV-023 evidence classes (E1 to E6) the control requires. Empty means not yet specified.",
          items: { type: "string", pattern: "^E[1-6]$" },
          uniqueItems: true
        },
        exception_policy: {
          type: "string",
          description: "NON_EXCEPTIONABLE only where EXC-021 section 7 names the requirement. check --catalog passes these controls to the engine, which never lets an exception waive them.",
          enum: ["ALLOWED", "NON_EXCEPTIONABLE"]
        },
        owner: {
          type: "object",
          description: "Control owner. Use the name UNASSIGNED as an explicit placeholder; it is never accepted for an APPROVED control.",
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1 },
            handle: { type: "string", pattern: "^@?[A-Za-z0-9][A-Za-z0-9-]*$" }
          },
          additionalProperties: false
        },
        status: {
          type: "string",
          description: "DRAFT controls are reported but not enforced. Only APPROVED controls block.",
          enum: ["DRAFT", "APPROVED", "DEPRECATED", "RETIRED"]
        },
        effective_from: { type: "string", format: "date" },
        retired_at: { type: "string", format: "date" }
      },
      allOf: [
        {
          if: {
            properties: { status: { const: "APPROVED" } },
            required: ["status"]
          },
          then: {
            required: ["effective_from"],
            properties: {
              effective_from: { type: "string" },
              owner: {
                type: "object",
                properties: { name: { type: "string", not: { const: "UNASSIGNED" } } }
              }
            }
          }
        },
        {
          if: {
            properties: { status: { const: "RETIRED" } },
            required: ["status"]
          },
          then: {
            required: ["retired_at"],
            properties: { retired_at: { type: "string" } }
          }
        }
      ],
      additionalProperties: false
    }
  }
};

// ../model/authority-policy.schema.json
var authority_policy_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://github.com/Inflame21/engineering-governance/blob/main/22-governance-operations/model/authority-policy.schema.json",
  title: "Engineering Governance Approver Authority Policy",
  description: "Who may approve an exception or accept a risk, by severity (EXC-021 section 15). Roles and their holders are data, so leadership can change them without a code change. P0 is never approvable through this flow (EXC-021 section 8) and cannot appear here.",
  type: "object",
  required: ["version", "policy_id", "policy_version", "description", "roles"],
  properties: {
    version: {
      type: "string",
      description: "Version of this policy schema the file conforms to.",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    policy_id: {
      type: "string",
      pattern: "^[a-z0-9][a-z0-9-]*$"
    },
    policy_version: {
      type: "string",
      description: "Version of this policy's content.",
      pattern: "^\\d+\\.\\d+\\.\\d+$"
    },
    description: {
      type: "string",
      minLength: 1
    },
    roles: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/role" }
    }
  },
  additionalProperties: false,
  $defs: {
    role: {
      type: "object",
      required: ["id", "title", "severities", "source_file", "source_section", "source_text", "holders", "status"],
      properties: {
        id: {
          type: "string",
          description: "Stable role id. An exception's approver_role and a risk's acceptance_role name it.",
          pattern: "^[A-Z][A-Z0-9_]*$"
        },
        title: { type: "string", minLength: 1 },
        severities: {
          type: "array",
          description: "Severities this role may approve. EXC-021 gives a minimum authority per severity, so a role covers its own severity and every lower one. P0 is not allowed.",
          minItems: 1,
          uniqueItems: true,
          items: { enum: ["P1", "P2", "P3"] }
        },
        source_file: { type: "string", minLength: 1 },
        source_section: { type: "string", minLength: 1 },
        source_text: {
          type: "string",
          description: "The row of the standard that defines the role, quoted verbatim. A test verifies it still exists.",
          minLength: 1
        },
        holders: {
          type: "array",
          description: "People who hold the role. Use the name UNASSIGNED as an explicit placeholder; it never counts as a holder.",
          minItems: 1,
          items: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string", minLength: 1 },
              handle: { type: "string", pattern: "^@?[A-Za-z0-9][A-Za-z0-9-]*$" },
              key_fingerprint: {
                type: "string",
                description: "Full fingerprint of the GPG key this holder signs approvals with (40 or 64 hex characters, spaces allowed). Used to authenticate a signed approval.",
                pattern: "^([0-9A-Fa-f]{4} ?){10,16}$"
              }
            },
            additionalProperties: false
          }
        },
        status: {
          type: "string",
          description: "DRAFT roles are reported but confer no authority. Only APPROVED roles are enforced.",
          enum: ["DRAFT", "APPROVED", "DEPRECATED", "RETIRED"]
        },
        effective_from: { type: "string", format: "date" },
        retired_at: { type: "string", format: "date" }
      },
      allOf: [
        {
          if: {
            properties: { status: { const: "APPROVED" } },
            required: ["status"]
          },
          then: {
            required: ["effective_from"],
            properties: {
              effective_from: { type: "string" },
              holders: {
                type: "array",
                contains: {
                  type: "object",
                  properties: { name: { type: "string", not: { const: "UNASSIGNED" } } }
                }
              }
            }
          }
        },
        {
          if: {
            properties: { status: { const: "RETIRED" } },
            required: ["status"]
          },
          then: {
            required: ["retired_at"],
            properties: { retired_at: { type: "string" } }
          }
        }
      ],
      additionalProperties: false
    }
  }
};

// ../model/architecture-profile-clean-architecture.json
var architecture_profile_clean_architecture_default = {
  id: "clean-architecture",
  version: "1.0.0",
  name: "Clean Architecture",
  description: "An architecture profile emphasizing inward dependency direction and isolation of domain rules from frameworks and infrastructure.",
  styles: [
    "clean-architecture",
    "layered"
  ],
  boundaryRules: [
    {
      id: "ARCH-DOMAIN-INDEPENDENCE",
      description: "Domain code must not depend on transport, UI, database, or framework-specific infrastructure.",
      severity: "P1",
      sourcePattern: "domain",
      targetPattern: "transport|ui|infrastructure|framework",
      allowed: false
    },
    {
      id: "ARCH-APPLICATION-DOMAIN",
      description: "Application workflows may depend on domain abstractions but must not be coupled to delivery frameworks.",
      severity: "P1",
      sourcePattern: "application",
      targetPattern: "transport|ui|framework",
      allowed: false
    }
  ],
  requiredControls: [
    "ARCH-DEPENDENCY-DIRECTION",
    "ARCH-BOUNDARY-OWNERSHIP"
  ],
  capabilities: [
    "dependency-graph-analysis",
    "layer-detection"
  ],
  componentMappings: {
    domain: [
      "src/domain/**",
      "domain/**",
      "app/domain/**"
    ],
    application: [
      "src/application/**",
      "application/**",
      "app/application/**"
    ],
    transport: [
      "src/api/**",
      "src/routes/**",
      "src/routers/**",
      "src/controllers/**",
      "api/**",
      "routes/**",
      "routers/**",
      "controllers/**"
    ],
    ui: [
      "src/components/**",
      "src/pages/**",
      "src/ui/**",
      "components/**",
      "pages/**",
      "ui/**"
    ],
    infrastructure: [
      "src/infrastructure/**",
      "src/infra/**",
      "src/database/**",
      "src/repositories/**",
      "infrastructure/**",
      "infra/**",
      "database/**",
      "repositories/**",
      "models/**",
      "db/**"
    ],
    framework: [
      "src/framework/**",
      "src/config/**",
      "config/**"
    ]
  }
};

// ../model/architecture-profile-hexagonal.json
var architecture_profile_hexagonal_default = {
  id: "hexagonal-architecture",
  version: "1.0.0",
  name: "Hexagonal Architecture (Ports and Adapters)",
  description: "Enforces dependency direction around the application core and separates inbound from outbound adapters.",
  styles: ["hexagonal", "ports-and-adapters"],
  boundaryRules: [
    {
      id: "HEX-001",
      description: "The domain, application core, and ports must not depend on inbound or outbound adapters.",
      severity: "P1",
      sourcePattern: "domain|application|ports",
      targetPattern: "inbound-adapters|outbound-adapters",
      allowed: false
    },
    {
      id: "HEX-002",
      description: "Inbound adapters must not depend directly on outbound adapters.",
      severity: "P1",
      sourcePattern: "inbound-adapters",
      targetPattern: "outbound-adapters",
      allowed: false
    }
  ],
  requiredControls: [],
  componentMappings: {
    domain: [
      "src/domain/**",
      "domain/**",
      "app/domain/**"
    ],
    application: [
      "src/application/**",
      "src/core/**",
      "application/**"
    ],
    ports: [
      "src/ports/**",
      "src/interfaces/**",
      "ports/**"
    ],
    "inbound-adapters": [
      "src/adapters/inbound/**",
      "src/inbound/**",
      "src/api/**",
      "src/controllers/**"
    ],
    "outbound-adapters": [
      "src/adapters/outbound/**",
      "src/outbound/**",
      "src/infrastructure/**",
      "src/repositories/**",
      "src/gateways/**"
    ]
  },
  metadata: {
    profileType: "architecture",
    status: "implemented",
    limitations: [
      "Component mappings are repository-specific and should be reviewed before enforcing this profile.",
      "Dependency extraction currently covers TypeScript/JavaScript and Python static imports; alias and dynamic imports may remain unresolved."
    ]
  }
};

// ../model/architecture-profile-microservices.json
var architecture_profile_microservices_default = {
  id: "microservices",
  version: "1.0.0",
  name: "Microservices",
  description: "An architecture profile for independently deployable services with explicit ownership and network contracts.",
  styles: [
    "microservices",
    "distributed-systems"
  ],
  boundaryRules: [
    {
      id: "ARCH-SERVICE-DATA-OWNERSHIP",
      description: "A service must not bypass another service's ownership by directly modifying its private datastore.",
      severity: "P1",
      sourcePattern: "service-a",
      targetPattern: "service-b-private-database",
      allowed: false
    }
  ],
  requiredControls: [
    "ARCH-SERVICE-OWNERSHIP",
    "API-CONTRACT-COMPATIBILITY",
    "OBS-DISTRIBUTED-TRACEABILITY"
  ],
  capabilities: [
    "service-discovery",
    "api-contract-analysis",
    "deployment-topology-analysis"
  ],
  componentMappings: {
    "service-a": [
      "services/service-a/**",
      "apps/service-a/**",
      "service-a/**"
    ],
    "service-b-private-database": [
      "services/service-b/database/**",
      "services/service-b/db/**",
      "service-b/database/**",
      "service-b/db/**"
    ]
  }
};

// ../model/architecture-profile-modular-example.json
var architecture_profile_modular_example_default = {
  id: "modular-architecture-example",
  version: "1.0.0",
  name: "Modular Architecture Example (Orders and Billing)",
  description: "Example policy for independently owned feature modules. Replace the sample module mappings and rules with the repository's actual module boundaries.",
  styles: ["modular", "feature-modules"],
  boundaryRules: [
    {
      id: "MOD-001",
      description: "The Orders feature must not import the Billing feature directly.",
      severity: "P1",
      sourcePattern: "feature-orders",
      targetPattern: "feature-billing",
      allowed: false
    },
    {
      id: "MOD-002",
      description: "The Billing feature must not import the Orders feature directly.",
      severity: "P1",
      sourcePattern: "feature-billing",
      targetPattern: "feature-orders",
      allowed: false
    },
    {
      id: "MOD-003",
      description: "The shared kernel must not depend on feature modules.",
      severity: "P1",
      sourcePattern: "shared-kernel",
      targetPattern: "feature-orders|feature-billing",
      allowed: false
    },
    {
      id: "MOD-004",
      description: "Feature modules must depend on infrastructure ports, not infrastructure implementations.",
      severity: "P1",
      sourcePattern: "feature-orders|feature-billing",
      targetPattern: "infrastructure",
      allowed: false
    }
  ],
  requiredControls: [],
  componentMappings: {
    "feature-orders": ["src/modules/orders/**"],
    "feature-billing": ["src/modules/billing/**"],
    "shared-kernel": ["src/shared/**"],
    infrastructure: ["src/infrastructure/**"]
  },
  metadata: {
    profileType: "architecture",
    template: true,
    status: "implemented",
    limitations: [
      "This is an illustrative two-module profile, not a universal module detector.",
      "Replace the sample module names, globs, and allowed dependencies before enforcing it."
    ]
  }
};

// src/config.ts
var Ajv2020 = require__();
var addFormats = require_dist();
var ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
var validateSchema = ajv.compile(governance_model_schema_default);
var validateArchitectureProfileSchema = ajv.compile(architecture_profile_schema_default);
var validateProjectRegistrationSchema = ajv.compile(project_registration_schema_default);
var validateControlCatalogSchema = ajv.compile(control_catalog_schema_default);
var validateAuthorityPolicySchema = ajv.compile(authority_policy_schema_default);
var BUNDLED_ARCHITECTURE_PROFILES = [
  architecture_profile_clean_architecture_default,
  architecture_profile_hexagonal_default,
  architecture_profile_microservices_default,
  architecture_profile_modular_example_default
];
var KNOWN_ARCHITECTURE_PROFILE_IDS = new Set(
  BUNDLED_ARCHITECTURE_PROFILES.map((profile) => profile.id)
);
function formatSchemaErrors(errors) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`).join("; ");
}
async function loadGovernancePack(rootPath, path12, fs) {
  const content = await fs.readTextFile(rootPath, path12);
  if (content === void 0) {
    throw new Error(`Governance pack not found: ${path12}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Governance pack is not valid JSON: ${message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Governance pack must be a JSON object");
  }
  if (!validateSchema(parsed)) {
    throw new Error(`Governance pack schema validation failed: ${formatSchemaErrors(validateSchema.errors ?? [])}`);
  }
  const pack = parsed;
  const semanticIssues = validateGovernancePackSemantics(pack);
  if (semanticIssues.length > 0) {
    const details = semanticIssues.map((issue) => `${issue.path} [${issue.code}]: ${issue.message}`).join("; ");
    throw new Error(`Governance pack semantic validation failed: ${details}`);
  }
  return pack;
}
async function loadArchitectureProfile(rootPath, path12, fs) {
  const content = await fs.readTextFile(rootPath, path12);
  if (content === void 0) throw new Error(`Architecture profile not found: ${path12}`);
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Architecture profile is not valid JSON: ${message}`);
  }
  return validateArchitectureProfileObject(parsed);
}
function validateArchitectureProfileObject(parsed) {
  if (!validateArchitectureProfileSchema(parsed)) {
    throw new Error(
      `Architecture profile validation failed: ${formatSchemaErrors(validateArchitectureProfileSchema.errors ?? [])}`
    );
  }
  const profile = parsed;
  const semanticValidation = validateArchitectureProfile(profile);
  if (!semanticValidation.valid) {
    throw new Error(`Architecture profile validation failed: ${semanticValidation.errors.join("; ")}`);
  }
  return profile;
}
function getRegisteredArchitectureProfile(id) {
  const profile = BUNDLED_ARCHITECTURE_PROFILES.find((candidate) => candidate.id === id);
  if (!profile) throw new Error(`Unknown architecture profile '${id}'`);
  return validateArchitectureProfileObject(structuredClone(profile));
}
async function loadProjectRegistry(rootPath, path12, fs) {
  const normalized = path12.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  const files = normalized.endsWith(".json") ? [normalized] : (await fs.listFiles(rootPath)).map((file) => file.replaceAll("\\", "/")).filter((file) => file.startsWith(`${normalized}/`) && file.endsWith(".json")).sort();
  if (files.length === 0) {
    throw new Error(`No project registration records (*.json) found in ${normalized || "."}`);
  }
  const records = [];
  for (const file of files) {
    const content = await fs.readTextFile(rootPath, file);
    if (content === void 0) throw new Error(`Project registration not found: ${file}`);
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Project registration ${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!validateProjectRegistrationSchema(parsed)) {
      throw new Error(`Project registration ${file} schema validation failed: ${formatSchemaErrors(validateProjectRegistrationSchema.errors ?? [])}`);
    }
    records.push({ file, record: parsed });
  }
  const issues = [];
  const idOwner = /* @__PURE__ */ new Map();
  const repositoryOwner = /* @__PURE__ */ new Map();
  for (const { file, record } of records) {
    const earlierId = idOwner.get(record.id);
    if (earlierId) issues.push(`${file}: project id '${record.id}' is already registered in ${earlierId}`);
    else idOwner.set(record.id, file);
    for (const repository of record.repositories) {
      const key = repository.name.toLowerCase();
      const earlier = repositoryOwner.get(key);
      if (earlier && earlier !== record.id) issues.push(`${file}: repository '${repository.name}' already belongs to project '${earlier}'`);
      else repositoryOwner.set(key, record.id);
    }
    if (!KNOWN_ARCHITECTURE_PROFILE_IDS.has(record.profiles.architecture)) {
      issues.push(`${file}: unknown architecture profile '${record.profiles.architecture}' (known: ${[...KNOWN_ARCHITECTURE_PROFILE_IDS].sort().join(", ")})`);
    }
  }
  if (issues.length > 0) throw new Error(`Project registry validation failed: ${issues.join("; ")}`);
  return records.map(({ record }) => record);
}
function selectProjectRegistration(records, projectId) {
  let selected;
  if (projectId !== void 0) {
    selected = records.find((record) => record.id === projectId);
    if (!selected) {
      throw new Error(`Project '${projectId}' is not registered (registered: ${records.map((r) => r.id).sort().join(", ")})`);
    }
  } else if (records.length === 1) {
    selected = records[0];
  } else {
    throw new Error(`The registry holds ${records.length} projects; pass --project <id> (registered: ${records.map((r) => r.id).sort().join(", ")})`);
  }
  if (!selected) throw new Error("No project could be selected from the registry");
  if (selected.status === "RETIRED") {
    throw new Error(`Project '${selected.id}' is RETIRED in the registry and cannot be assessed`);
  }
  return selected;
}
function assertPackMatchesRegistration(pack, registration) {
  const issues = [];
  if (pack.project.id !== registration.id) {
    issues.push(`pack project id '${pack.project.id}' does not match registered project '${registration.id}'`);
  }
  const repository = pack.project.repository.toLowerCase();
  if (!registration.repositories.some((candidate) => candidate.name.toLowerCase() === repository)) {
    issues.push(`pack repository '${pack.project.repository}' is not one of the repositories registered for '${registration.id}' (${registration.repositories.map((r) => r.name).join(", ")})`);
  }
  if (issues.length > 0) throw new Error(`Governance pack does not belong to the registered project: ${issues.join("; ")}`);
}
async function loadControlCatalog(rootPath, path12, fs) {
  const content = await fs.readTextFile(rootPath, path12);
  if (content === void 0) throw new Error(`Control catalog not found: ${path12}`);
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Control catalog is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!validateControlCatalogSchema(parsed)) {
    throw new Error(`Control catalog schema validation failed: ${formatSchemaErrors(validateControlCatalogSchema.errors ?? [])}`);
  }
  const catalog = parsed;
  const seen = /* @__PURE__ */ new Set();
  const duplicates = /* @__PURE__ */ new Set();
  for (const control of catalog.controls) {
    if (seen.has(control.id)) duplicates.add(control.id);
    seen.add(control.id);
  }
  if (duplicates.size > 0) {
    throw new Error(`Control catalog validation failed: duplicate control id(s): ${[...duplicates].sort().join(", ")}`);
  }
  return catalog;
}
async function loadAuthorityPolicy(rootPath, path12, fs) {
  const content = await fs.readTextFile(rootPath, path12);
  if (content === void 0) throw new Error(`Authority policy not found: ${path12}`);
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Authority policy is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!validateAuthorityPolicySchema(parsed)) {
    throw new Error(`Authority policy schema validation failed: ${formatSchemaErrors(validateAuthorityPolicySchema.errors ?? [])}`);
  }
  const policy = parsed;
  const seen = /* @__PURE__ */ new Set();
  const duplicates = /* @__PURE__ */ new Set();
  for (const role of policy.roles) {
    if (seen.has(role.id)) duplicates.add(role.id);
    seen.add(role.id);
  }
  if (duplicates.size > 0) {
    throw new Error(`Authority policy validation failed: duplicate role id(s): ${[...duplicates].sort().join(", ")}`);
  }
  return policy;
}

// ../engine/src/analyzer.ts
function mergeAnalyzerOutputs(outputs) {
  return {
    signals: [...new Set(outputs.flatMap((item) => item.signals))],
    facts: outputs.reduce(
      (all, item) => ({ ...all, ...item.facts ?? {} }),
      {}
    ),
    evidence: outputs.flatMap((item) => item.evidence ?? [])
  };
}

// ../analyzer/src/adapters/frameworks.ts
var frameworkAdapter = {
  id: "framework-detection",
  version: "0.1.0",
  languages: [],
  capabilities: ["manifest-dependency-detection", "framework-detection"],
  supports: (snapshot) => snapshot.files.some(
    (file) => /(^|\/)(package\.json|pyproject\.toml|requirements\.txt)$/.test(file)
  ),
  async analyze(snapshot) {
    const signals = /* @__PURE__ */ new Set();
    const frameworks = /* @__PURE__ */ new Set();
    const manifestErrors = [];
    let inspectedManifestCount = 0;
    let successfullyInspectedManifestCount = 0;
    const packages = [
      ["next", "nextjs", "framework:nextjs"],
      ["react", "react", "framework:react"],
      ["express", "express", "framework:express"],
      ["@nestjs/core", "nestjs", "framework:nestjs"],
      ["vite", "vite", "build:vite"]
    ];
    for (const [manifestPath, content] of Object.entries(snapshot.fileContents ?? {})) {
      const basename2 = manifestPath.split("/").at(-1);
      if (basename2 !== "package.json" && basename2 !== "pyproject.toml" && basename2 !== "requirements.txt") {
        continue;
      }
      inspectedManifestCount += 1;
      if (basename2 === "package.json") {
        try {
          const packageJson = parsePackageJson(content);
          successfullyInspectedManifestCount += 1;
          for (const [dependency, framework, signal] of packages) {
            if (hasPackageDependency(packageJson, dependency)) {
              frameworks.add(framework);
              signals.add(signal);
            }
          }
        } catch (error) {
          manifestErrors.push(
            `${manifestPath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      } else {
        successfullyInspectedManifestCount += 1;
        if (hasPythonDependency(content, "fastapi")) {
          frameworks.add("fastapi");
          signals.add("framework:fastapi");
        }
        if (hasPythonDependency(content, "django")) {
          frameworks.add("django");
          signals.add("framework:django");
        }
      }
    }
    const unsupportedCapabilities = /* @__PURE__ */ new Set();
    const limitations = [...manifestErrors];
    if (manifestErrors.length > 0) unsupportedCapabilities.add("framework-detection:manifest-parse");
    if (frameworks.size === 0) {
      unsupportedCapabilities.add("framework-detection");
      const allReadableManifestsFailed = inspectedManifestCount > 0 && successfullyInspectedManifestCount === 0;
      return {
        facts: {},
        signals: [],
        evidence: [],
        executionStatus: allReadableManifestsFailed ? "FAILED" : "PARTIAL",
        supportedCapabilities: successfullyInspectedManifestCount > 0 ? ["manifest-dependency-detection"] : [],
        unsupportedCapabilities: [...unsupportedCapabilities].sort(),
        limitations: [
          ...manifestErrors.length > 0 ? [] : [
            inspectedManifestCount > 0 ? "Supported manifests were inspected, but no recognized framework dependency was found." : "Manifest files were discovered but their contents were unavailable to the analyzer."
          ],
          ...limitations
        ]
      };
    }
    const partial = manifestErrors.length > 0;
    const evidence = {
      id: "EVD-FRAMEWORK-MANIFEST",
      type: "E3_AUTOMATED_ANALYSIS",
      status: partial ? "PARTIALLY_VERIFIED" : "VERIFIED",
      description: partial ? `Framework identity was determined from ${successfullyInspectedManifestCount} manifest(s); ${manifestErrors.length} manifest(s) could not be parsed.` : `Framework identity was determined from ${successfullyInspectedManifestCount} project manifest(s).`,
      source: "framework-detection-adapter",
      freshness: "current",
      supports_controls: []
    };
    return {
      facts: { frameworks: [...frameworks].sort() },
      signals: [...signals].sort(),
      evidence: [evidence],
      executionStatus: partial ? "PARTIAL" : "SUCCESS",
      supportedCapabilities: ["manifest-dependency-detection", "framework-detection"],
      unsupportedCapabilities: [...unsupportedCapabilities].sort(),
      limitations
    };
  }
};

// ../analyzer/src/adapters/generic.ts
var genericRepositoryAdapter = {
  id: "generic-repository",
  version: "0.1.0",
  languages: [],
  capabilities: [
    "repository-structure",
    "ci-detection",
    "container-detection",
    "migration-detection",
    "test-presence-detection"
  ],
  supports: () => true,
  async analyze(snapshot) {
    const files = new Set(snapshot.files);
    const signals = /* @__PURE__ */ new Set();
    const evidence = [];
    if ([...files].some((file) => /(^|\/)\.github\/workflows\/.*\.ya?ml$/.test(file))) {
      signals.add("ci:configured");
    }
    if ([...files].some((file) => /(^|\/)(Dockerfile|docker-compose\.ya?ml)$/.test(file))) {
      signals.add("containerized");
    }
    if ([...files].some((file) => /(^|\/)(migrations?|alembic|prisma)\//.test(file))) {
      signals.add("database:migrations");
    }
    if ([...files].some((file) => /(^|\/)(tests?|__tests__)\//.test(file))) {
      signals.add("tests:present");
    }
    if (signals.size > 0) {
      evidence.push({
        id: "EVD-REPO-STRUCTURE",
        type: "E2_INSPECTION",
        status: "VERIFIED",
        description: "Repository structure was inspected for governance-relevant engineering capabilities.",
        source: "generic-repository-adapter",
        freshness: "current",
        supports_controls: []
      });
    }
    return {
      facts: {},
      signals: [...signals].sort(),
      evidence,
      supportedCapabilities: ["repository-structure", "ci-detection", "container-detection", "migration-detection", "test-presence-detection"]
    };
  }
};

// ../analyzer/src/adapters/python.ts
var pythonAdapter = {
  id: "python",
  version: "0.1.0",
  languages: ["python"],
  capabilities: [
    "python-api-path-detection",
    "python-database-path-detection",
    "python-test-path-detection"
  ],
  supports: (snapshot) => snapshot.files.some((file) => file.endsWith(".py")),
  async analyze(snapshot) {
    const files = snapshot.files;
    const signals = /* @__PURE__ */ new Set();
    if (files.some((file) => /(^|\/)(routers?|routes?|views?|api)\//.test(file))) {
      signals.add("capability:http-api");
    }
    if (files.some((file) => /(^|\/)(models?|repositories?|dal)\//.test(file))) {
      signals.add("capability:database-access");
    }
    if (files.some((file) => /(^|\/)(tests?|test_.*\.py$|.*_test\.py$)/.test(file))) {
      signals.add("tests:python");
    }
    return {
      facts: {},
      signals: [...signals].sort(),
      evidence: [],
      supportedCapabilities: [...this.capabilities]
    };
  }
};

// ../analyzer/src/adapters/typescript.ts
var typescriptAdapter = {
  id: "typescript",
  version: "0.1.0",
  languages: ["typescript", "javascript"],
  capabilities: [
    "typescript-api-path-detection",
    "typescript-frontend-path-detection",
    "typescript-test-path-detection"
  ],
  supports: (snapshot) => snapshot.files.some((file) => /\.(ts|tsx|js|jsx)$/.test(file)),
  async analyze(snapshot) {
    const files = snapshot.files;
    const signals = /* @__PURE__ */ new Set();
    if (files.some((file) => /(^|\/)(src\/)?(api|routes?|controllers?)\//.test(file))) {
      signals.add("capability:http-api");
    }
    if (files.some((file) => /(^|\/)(components?|pages?|app)\//i.test(file)) || files.some((file) => /(^|\/)(App|main|index)\.(tsx|jsx)$/i.test(file))) {
      signals.add("capability:frontend");
    }
    if (files.some((file) => /(^|\/)(tests?|__tests__)\//.test(file))) {
      signals.add("tests:typescript");
    }
    return {
      facts: {},
      signals: [...signals].sort(),
      evidence: [],
      supportedCapabilities: [...this.capabilities]
    };
  }
};

// ../analyzer/src/adapters/registry.ts
var defaultAnalyzerAdapters = [
  genericRepositoryAdapter,
  frameworkAdapter,
  typescriptAdapter,
  pythonAdapter
];

// ../analyzer/src/normalize.ts
function toGovernanceContext(analysis) {
  const signals = new Set(analysis.signals);
  for (const language of analysis.facts.languages) {
    signals.add(`language:${language}`);
  }
  for (const framework of analysis.facts.frameworks) {
    signals.add(`framework:${framework}`);
  }
  for (const manager of analysis.facts.packageManagers) {
    signals.add(`package_manager:${manager}`);
  }
  for (const buildSystem of analysis.facts.buildSystems) {
    signals.add(`build_system:${buildSystem}`);
  }
  for (const infrastructure of analysis.facts.infrastructureSystems) {
    signals.add(`infrastructure:${infrastructure}`);
  }
  for (const testSystem of analysis.facts.testSystems) {
    signals.add(`test_system:${testSystem}`);
  }
  const unsupportedCapabilities = [
    ...new Set(analysis.adapterResults.flatMap((result) => result.unsupportedCapabilities))
  ].sort();
  const analyzerLimitations = [
    ...new Set(analysis.adapterResults.flatMap((result) => result.limitations))
  ].sort();
  const hasFailure = analysis.adapterResults.some((result) => result.executionStatus === "FAILED");
  const hasPartialResult = analysis.adapterResults.some(
    (result) => result.executionStatus === "PARTIAL" || result.executionStatus === "SKIPPED"
  );
  const analysisStatus = analysis.adapterResults.length === 0 ? "PARTIAL" : hasFailure && analysis.adapterResults.every(
    (result) => result.executionStatus === "FAILED" || result.executionStatus === "SKIPPED"
  ) ? "FAILED" : hasFailure || hasPartialResult || unsupportedCapabilities.length > 0 ? "PARTIAL" : "COMPLETE";
  if (analysis.adapterResults.length === 0) {
    unsupportedCapabilities.push("analysis:no-adapters");
    analyzerLimitations.push("No analyzer adapters produced a result.");
  }
  return {
    signals: [...signals].sort(),
    facts: analysis.facts,
    findings: analysis.findings,
    analysisStatus,
    unsupportedCapabilities: [...new Set(unsupportedCapabilities)].sort(),
    analyzerLimitations: [...new Set(analyzerLimitations)].sort(),
    ...analysis.changeScope ? {
      changeScopeStatus: analysis.changeScope.status,
      ...analysis.changeScope.reason ? { changeScopeReason: analysis.changeScope.reason } : {},
      changedFiles: analysis.changeScope.files
    } : {},
    evaluatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...analysis.snapshotFingerprint ? { repositoryFingerprint: analysis.snapshotFingerprint.digest } : {}
  };
}

// ../analyzer/src/fingerprint.ts
import { createHash } from "node:crypto";
var sourceExtensions3 = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".java",
  ".rs",
  ".cs",
  ".rb",
  ".php",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cc",
  ".cpp",
  ".hpp"
]);
var GENERATED_OUTPUT_PREFIXES = [".governance/history/", ".governance/reports/"];
function fingerprintRepositorySnapshot(snapshot) {
  const files = [...new Set(snapshot.files.map((file) => file.replaceAll("\\", "/")))].filter((file) => !GENERATED_OUTPUT_PREFIXES.some((prefix) => file.startsWith(prefix))).sort();
  const contents = new Map(
    Object.entries(snapshot.fileContents ?? {}).map(([file, value]) => [file.replaceAll("\\", "/"), value])
  );
  const fileSet = new Set(files);
  const sourceFiles = files.filter((file) => sourceExtensions3.has(file.slice(file.lastIndexOf(".")).toLowerCase()));
  const inspectedSourceFiles = sourceFiles.filter((file) => contents.has(file));
  const limitations = [...snapshot.contentLimitations ?? []];
  if (inspectedSourceFiles.length < sourceFiles.length && limitations.length === 0) {
    limitations.push("Some source files were not ingested; the fingerprint covers paths and available content only.");
  }
  const field = (text) => text === void 0 ? "-1:" : `${Buffer.byteLength(text, "utf8")}:${text}`;
  const hash = createHash("sha256");
  hash.update("engineering-governance-snapshot-v2\0");
  for (const file of files) {
    hash.update(field(file));
    hash.update(field(contents.get(file)));
  }
  return {
    algorithm: "sha256",
    digest: `sha256:${hash.digest("hex")}`,
    fileCount: files.length,
    ingestedContentFileCount: [...contents.keys()].filter((file) => fileSet.has(file)).length,
    sourceFileCount: sourceFiles.length,
    inspectedSourceFileCount: inspectedSourceFiles.length,
    sourceContentStatus: inspectedSourceFiles.length === sourceFiles.length && limitations.length === 0 ? "COMPLETE" : "PARTIAL",
    limitations
  };
}

// ../analyzer/src/system-graph.ts
import path3 from "node:path";
function stableId2(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}
function sourceMatches(file, content, pattern, hasMethod = false) {
  const matches = [];
  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    matches.push({
      file,
      line: content.slice(0, index).split("\n").length,
      value: hasMethod ? match[2] ?? "" : match[1] ?? "",
      ...hasMethod ? { method: (match[1] ?? "").toUpperCase() } : {}
    });
  }
  return matches;
}
function databaseDrivers(snapshot, manifestPaths) {
  const drivers = /* @__PURE__ */ new Set();
  const jsDrivers = [
    ["pg", "postgresql"],
    ["mysql2", "mysql"],
    ["mongoose", "mongodb"],
    ["mongodb", "mongodb"],
    ["prisma", "prisma"],
    ["sequelize", "sequelize"],
    ["typeorm", "typeorm"],
    ["knex", "knex"]
  ];
  const pythonDrivers = [
    ["sqlalchemy", "sqlalchemy"],
    ["psycopg", "postgresql"],
    ["psycopg2", "postgresql"],
    ["asyncpg", "postgresql"],
    ["pymongo", "mongodb"],
    ["motor", "mongodb"],
    ["sqlite3", "sqlite"]
  ];
  for (const manifestPath of manifestPaths) {
    const content = snapshot.fileContents?.[manifestPath];
    if (!content) continue;
    const basename2 = path3.posix.basename(manifestPath);
    if (basename2 === "package.json") {
      try {
        const packageJson = parsePackageJson(content);
        for (const [dependency, driver] of jsDrivers) {
          if (hasPackageDependency(packageJson, dependency)) drivers.add(driver);
        }
      } catch {
      }
    } else if (basename2 === "pyproject.toml" || basename2 === "requirements.txt") {
      for (const [dependency, driver] of pythonDrivers) {
        if (hasPythonDependency(content, dependency)) drivers.add(driver);
      }
    }
  }
  return [...drivers].sort();
}
function buildRepositorySystemGraph(snapshot) {
  const packages = detectRepositoryFacts(snapshot).packages ?? [];
  const nodes = [];
  const edges = [];
  const evidenceById = /* @__PURE__ */ new Map();
  const limitations = [
    "API routes, database drivers, and event names are inferred from supported static patterns; dynamic registration and computed names may be missed."
  ];
  const addEvidence = (id, status, description, source) => {
    if (!evidenceById.has(id)) {
      evidenceById.set(id, {
        id,
        type: "E3_AUTOMATED_ANALYSIS",
        status,
        description,
        source,
        freshness: "current",
        supports_controls: []
      });
    }
    return id;
  };
  const addNode = (node) => {
    const existing = nodes.find((item) => item.id === node.id);
    if (!existing) {
      nodes.push(node);
      return;
    }
    existing.evidenceRefs = [.../* @__PURE__ */ new Set([...existing.evidenceRefs, ...node.evidenceRefs])].sort();
    existing.confidence = Math.min(existing.confidence, node.confidence);
    if (existing.packageId && node.packageId && existing.packageId !== node.packageId) {
      delete existing.packageId;
    }
    if (!existing.sourceLocation && node.sourceLocation) existing.sourceLocation = node.sourceLocation;
  };
  const addEdge = (edge) => {
    const existing = edges.find((item) => item.id === edge.id);
    if (!existing) edges.push(edge);
  };
  const rootEvidence = addEvidence(
    "EVD-SYSTEM-REPOSITORY",
    "VERIFIED",
    "Repository root was established from the inspected snapshot.",
    "repository-system-graph"
  );
  addNode({
    id: "REPO:ROOT",
    type: "REPOSITORY",
    name: "repository",
    confidence: 1,
    evidenceRefs: [rootEvidence]
  });
  for (const projectPackage of packages) {
    const packageEvidence = addEvidence(
      `EVD-SYSTEM-PACKAGE-${stableId2(projectPackage.id)}`,
      "VERIFIED",
      `Package ownership was derived from manifest roots for '${projectPackage.root}'.`,
      projectPackage.manifestPaths[0] ?? "repository-snapshot"
    );
    addNode({
      id: projectPackage.id,
      type: "PACKAGE",
      name: projectPackage.root === "." ? "root" : path3.posix.basename(projectPackage.root),
      packageId: projectPackage.id,
      confidence: 1,
      evidenceRefs: [packageEvidence]
    });
    addEdge({
      id: `SYS-EDGE-${stableId2(`contains:${projectPackage.id}`)}`,
      type: "CONTAINS",
      sourceId: "REPO:ROOT",
      targetId: projectPackage.id,
      confidence: 1,
      evidenceRefs: [packageEvidence]
    });
    const firstSegment = projectPackage.root.split("/")[0] ?? "";
    if (projectPackage.root !== "." && ["services", "service", "backend", "workers", "worker"].includes(firstSegment)) {
      const serviceId = `SERVICE:${stableId2(projectPackage.root)}`;
      const serviceEvidence = addEvidence(
        `EVD-SYSTEM-SERVICE-${stableId2(projectPackage.root)}`,
        "PARTIALLY_VERIFIED",
        `Service identity was inferred from the package path '${projectPackage.root}'; runtime deployment topology was not inspected.`,
        projectPackage.manifestPaths[0] ?? "repository-snapshot"
      );
      addNode({
        id: serviceId,
        type: "SERVICE",
        name: path3.posix.basename(projectPackage.root),
        packageId: projectPackage.id,
        confidence: 0.85,
        evidenceRefs: [serviceEvidence]
      });
      addEdge({
        id: `SYS-EDGE-${stableId2(`contains-service:${serviceId}`)}`,
        type: "CONTAINS",
        sourceId: "REPO:ROOT",
        targetId: serviceId,
        confidence: 0.85,
        evidenceRefs: [serviceEvidence]
      });
      addEdge({
        id: `SYS-EDGE-${stableId2(`service-package:${serviceId}:${projectPackage.id}`)}`,
        type: "IMPLEMENTED_BY",
        sourceId: serviceId,
        targetId: projectPackage.id,
        confidence: 0.85,
        evidenceRefs: [serviceEvidence, packageEvidence]
      });
    }
    const manifestPaths2 = projectPackage.manifestPaths;
    const drivers = databaseDrivers(snapshot, manifestPaths2);
    for (const driver of drivers) {
      const evidenceId = addEvidence(
        `EVD-SYSTEM-DB-${stableId2(`${projectPackage.id}:${driver}`)}`,
        "VERIFIED",
        `Database driver '${driver}' was found in a project manifest.`,
        manifestPaths2.join(", ") || "repository-snapshot"
      );
      const databaseId = `DATABASE:${stableId2(`${projectPackage.id}:${driver}`)}`;
      addNode({
        id: databaseId,
        type: "DATABASE",
        name: driver,
        packageId: projectPackage.id,
        confidence: 0.95,
        evidenceRefs: [evidenceId]
      });
      addEdge({
        id: `SYS-EDGE-${stableId2(`database:${projectPackage.id}:${driver}`)}`,
        type: "USES_DATABASE",
        sourceId: projectPackage.id,
        targetId: databaseId,
        confidence: 0.95,
        evidenceRefs: [evidenceId]
      });
    }
  }
  const orderedPackages = [...packages].sort((left, right) => right.root.length - left.root.length);
  const packageForFile = (file) => orderedPackages.find(
    (item) => item.root === "." || file === item.root || file.startsWith(`${item.root}/`)
  );
  const sourceFiles = snapshot.files.filter((file) => /\.(py|ts|tsx|js|jsx|mjs|cjs)$/.test(file)).sort();
  for (const file of sourceFiles) {
    const content = snapshot.fileContents?.[file];
    if (content === void 0) continue;
    const projectPackage = packageForFile(file);
    if (!projectPackage) continue;
    const apiMatches = file.endsWith(".py") ? sourceMatches(file, content, /@(?:\w+)\.(get|post|put|patch|delete|options|head)\s*\(\s*["']([^"']+)["']/gi, true) : sourceMatches(file, content, /\b(?:app|router)\.(get|post|put|patch|delete|options|head)\s*\(\s*["']([^"']+)["']/gi, true);
    for (const match of apiMatches) {
      const method = match.method ?? "GET";
      const endpointName = `${method} ${match.value}`;
      const evidenceId = addEvidence(
        `EVD-SYSTEM-API-${stableId2(`${file}:${match.line}:${endpointName}`)}`,
        "VERIFIED",
        `A static HTTP route registration for '${endpointName}' was found.`,
        `${file}:${match.line}`
      );
      const apiId = `API:${stableId2(`${projectPackage.id}:${endpointName}`)}`;
      addNode({
        id: apiId,
        type: "API_ENDPOINT",
        name: endpointName,
        packageId: projectPackage.id,
        sourceLocation: { file, line: match.line },
        confidence: 0.95,
        evidenceRefs: [evidenceId]
      });
      addEdge({
        id: `SYS-EDGE-${stableId2(`api:${projectPackage.id}:${file}:${match.line}`)}`,
        type: "EXPOSES_API",
        sourceId: projectPackage.id,
        targetId: apiId,
        sourceLocation: { file, line: match.line },
        confidence: 0.95,
        evidenceRefs: [evidenceId]
      });
    }
    const eventPatterns = [
      { type: "PUBLISHES_EVENT", pattern: /\b(?:emit|publish|dispatch|sendToQueue)\s*\(\s*["']([^"']+)["']/g },
      { type: "SUBSCRIBES_EVENT", pattern: /\b(?:subscribe|consume)\s*\(\s*["']([^"']+)["']/g }
    ];
    for (const eventPattern of eventPatterns) {
      for (const match of sourceMatches(file, content, eventPattern.pattern)) {
        const eventName = match.value;
        const evidenceId = addEvidence(
          `EVD-SYSTEM-EVENT-${stableId2(`${file}:${match.line}:${eventPattern.type}:${eventName}`)}`,
          "PARTIALLY_VERIFIED",
          `A static event ${eventPattern.type === "PUBLISHES_EVENT" ? "publisher" : "subscriber"} call for '${eventName}' was found; runtime delivery is not verified.`,
          `${file}:${match.line}`
        );
        const eventId = `EVENT:${stableId2(eventName)}`;
        addNode({
          id: eventId,
          type: "EVENT",
          name: eventName,
          sourceLocation: { file, line: match.line },
          confidence: 0.65,
          evidenceRefs: [evidenceId]
        });
        addEdge({
          id: `SYS-EDGE-${stableId2(`event:${projectPackage.id}:${file}:${match.line}:${eventPattern.type}`)}`,
          type: eventPattern.type,
          sourceId: projectPackage.id,
          targetId: eventId,
          sourceLocation: { file, line: match.line },
          confidence: 0.65,
          evidenceRefs: [evidenceId]
        });
      }
    }
  }
  const contentLimitations = snapshot.contentLimitations ?? [];
  const unreadSourceFiles = sourceFiles.filter((file) => snapshot.fileContents?.[file] === void 0);
  const manifestPaths = packages.flatMap((item) => item.manifestPaths);
  const unreadManifestPaths = manifestPaths.filter((file) => snapshot.fileContents?.[file] === void 0);
  if (contentLimitations.length > 0 || unreadSourceFiles.length > 0 || unreadManifestPaths.length > 0) {
    limitations.push(...contentLimitations);
    if (unreadSourceFiles.length > 0) {
      limitations.push(`System relationships were not inspected in ${unreadSourceFiles.length} source file(s).`);
    }
    if (unreadManifestPaths.length > 0) {
      limitations.push(`Package manifests were not inspected for system relationships: ${unreadManifestPaths.join(", ")}.`);
    }
  }
  return {
    status: contentLimitations.length > 0 || unreadSourceFiles.length > 0 || unreadManifestPaths.length > 0 ? "PARTIAL" : "COMPLETE",
    nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.sort((a, b) => a.id.localeCompare(b.id)),
    evidence: [...evidenceById.values()].sort((a, b) => a.id.localeCompare(b.id)),
    limitations: [...new Set(limitations)].sort()
  };
}

// ../analyzer/src/pipeline.ts
var factKeys = [
  "languages",
  "frameworks",
  "packageManagers",
  "buildSystems",
  "infrastructureSystems",
  "testSystems"
];
function mergeRepositoryFacts(baseFacts, outputs) {
  const merged = { ...baseFacts };
  for (const key of factKeys) {
    const adapterValues = outputs.flatMap((output) => {
      const value = output.facts?.[key];
      return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
    });
    merged[key] = [.../* @__PURE__ */ new Set([...baseFacts[key], ...adapterValues])].sort();
  }
  return merged;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
async function analyzeRepository(snapshot, adapters = defaultAnalyzerAdapters, architectureProfile) {
  const baseFacts = detectRepositoryFacts(snapshot);
  const detectedLanguages = new Set(baseFacts.languages);
  const registeredLanguages = new Set(adapters.flatMap((adapter) => adapter.languages));
  const outputs = [];
  const adapterResults = [];
  const findings = [];
  const relevantAdapters = adapters.filter(
    (adapter) => adapter.supports(snapshot) || adapter.languages.some((language) => detectedLanguages.has(language)) || adapter.languages.length === 0
  );
  for (const adapter of relevantAdapters) {
    if (!adapter.supports(snapshot)) {
      adapterResults.push({
        adapterId: adapter.id,
        version: adapter.version,
        executionStatus: "SKIPPED",
        supportedCapabilities: [],
        unsupportedCapabilities: [...adapter.capabilities],
        evidenceRefs: [],
        limitations: ["Adapter was relevant to the detected repository but could not run on the available snapshot."]
      });
      continue;
    }
    try {
      const result = await adapter.analyze(snapshot);
      const executionStatus = result.executionStatus ?? "SUCCESS";
      const supportedCapabilities = result.supportedCapabilities ?? [...adapter.capabilities];
      const unsupportedCapabilities = result.unsupportedCapabilities ?? [];
      const limitations = result.limitations ?? [];
      outputs.push({
        signals: result.signals,
        ...result.facts ? { facts: result.facts } : {},
        evidence: result.evidence ?? []
      });
      findings.push(...result.findings ?? []);
      adapterResults.push({
        adapterId: adapter.id,
        version: adapter.version,
        executionStatus,
        supportedCapabilities,
        unsupportedCapabilities,
        evidenceRefs: (result.evidence ?? []).map((item) => item.id),
        limitations
      });
    } catch (error) {
      adapterResults.push({
        adapterId: adapter.id,
        version: adapter.version,
        executionStatus: "FAILED",
        supportedCapabilities: [],
        unsupportedCapabilities: [...adapter.capabilities],
        evidenceRefs: [],
        limitations: [`Adapter execution failed: ${errorMessage(error)}`]
      });
    }
  }
  const uncoveredLanguages = [...detectedLanguages].filter(
    (language) => !registeredLanguages.has(language)
  );
  if (uncoveredLanguages.length > 0) {
    adapterResults.push({
      adapterId: "language-coverage",
      version: "0.1.0",
      executionStatus: "PARTIAL",
      supportedCapabilities: [],
      unsupportedCapabilities: uncoveredLanguages.map((language) => `language-specific-analysis:${language}`),
      evidenceRefs: [],
      limitations: [`No language-specific adapter is registered for: ${uncoveredLanguages.join(", ")}.`]
    });
  }
  if (snapshot.contentLimitations?.length) {
    adapterResults.push({
      adapterId: "repository-snapshot",
      version: "0.1.0",
      executionStatus: "PARTIAL",
      supportedCapabilities: [],
      unsupportedCapabilities: ["repository:source-content"],
      evidenceRefs: [],
      limitations: [...snapshot.contentLimitations]
    });
  }
  const merged = mergeAnalyzerOutputs(outputs);
  const snapshotFingerprint = fingerprintRepositorySnapshot(snapshot);
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const architecture = architectureProfile ? verifyArchitectureProfile(snapshot, architectureProfile) : void 0;
  const systemGraph = buildRepositorySystemGraph(snapshot);
  if (architecture) {
    findings.push(...architecture.findings);
    adapterResults.push({
      adapterId: `architecture-profile:${architecture.profileId}`,
      version: architectureProfile?.version ?? "unknown",
      executionStatus: architecture.status === "FAILED" ? "FAILED" : architecture.status === "PARTIAL" ? "PARTIAL" : "SUCCESS",
      supportedCapabilities: architecture.supportedCapabilities,
      unsupportedCapabilities: architecture.unsupportedCapabilities,
      evidenceRefs: architecture.evidence.map((item) => item.id),
      limitations: architecture.limitations
    });
  }
  const analysis = {
    facts: mergeRepositoryFacts(baseFacts, outputs),
    signals: merged.signals,
    evidence: [...merged.evidence ?? [], ...architecture?.evidence ?? [], ...systemGraph.evidence].map((item) => ({
      ...item,
      generated_at: item.generated_at ?? generatedAt,
      repository_fingerprint: item.repository_fingerprint ?? snapshotFingerprint.digest
    })),
    findings,
    adapterResults,
    ...architecture ? { architecture } : {},
    systemGraph,
    ...snapshot.changeScope ? { changeScope: snapshot.changeScope } : {},
    snapshotFingerprint
  };
  toGovernanceContext(analysis);
  return analysis;
}

// ../analyzer/src/verification-shared.ts
function stableId3(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}
function basename(file) {
  return file.split("/").at(-1) ?? file;
}
function directoryname(file) {
  const index = file.lastIndexOf("/");
  return index < 0 ? "." : file.slice(0, index) || ".";
}
function compactOutput(stdout, stderr) {
  return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(0, 4e3);
}
function concludeScanner(identity, outcome, fingerprint) {
  const completed = outcome.status === "PASS" || outcome.status === "WARN" || outcome.status === "FAIL";
  const processResult = outcome.processResult;
  const evidence = processResult ? [{
    id: identity.evidenceId,
    type: "E3_AUTOMATED_ANALYSIS",
    status: evidenceStatusForResult(outcome.status),
    result_status: outcome.status,
    description: outcome.summary,
    source: identity.evidenceSource,
    freshness: "current",
    supports_controls: [],
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    repository_fingerprint: fingerprint.digest,
    ...outcome.version ? { tool_version: outcome.version } : {},
    ...processResult.durationMs !== void 0 ? { duration_ms: processResult.durationMs } : {},
    exit_code: processResult.exitCode,
    command: outcome.command
  }] : [];
  return {
    result: {
      tool: identity.tool,
      status: outcome.status,
      command: outcome.command,
      ...processResult ? { exitCode: processResult.exitCode, evidenceId: identity.evidenceId } : {},
      summary: outcome.summary,
      ...outcome.version ? { toolVersion: outcome.version } : {},
      findings: outcome.findings,
      limitations: outcome.limitations
    },
    evidence,
    findings: outcome.findings,
    adapterResult: {
      adapterId: identity.adapterId,
      version: identity.adapterVersion,
      executionStatus: completed ? "SUCCESS" : outcome.status === "ERROR" ? "FAILED" : "PARTIAL",
      supportedCapabilities: completed ? [identity.capability] : [],
      unsupportedCapabilities: completed ? [] : [identity.capability],
      evidenceRefs: processResult ? [identity.evidenceId] : [],
      limitations: outcome.limitations
    }
  };
}

// ../analyzer/src/gitleaks.ts
var IDENTITY = {
  tool: "gitleaks",
  adapterId: "gitleaks-secret-scan",
  adapterVersion: "0.1.0",
  capability: "verification:gitleaks-secret-scan",
  evidenceId: "EVD-GITLEAKS-SECRETS",
  evidenceSource: "gitleaks-adapter"
};
var TOOL_TIMEOUT_MS = 12e4;
var LEAK_EXIT_CODE = 2;
var COMMON_ARGS = ["--exit-code", String(LEAK_EXIT_CODE), "--redact", "--no-banner", "--no-color", "--log-level", "error"];
function classify(exitCode, scope, stderr = "") {
  if (exitCode === LEAK_EXIT_CODE) return "leaks";
  if (exitCode === 0) {
    if (stderr.trim() === "") return "clean";
    return scope === "git history" && /not a git repository/i.test(stderr) ? "unavailable" : "error";
  }
  if (exitCode === 1 && scope === "git history") return "unavailable";
  return "error";
}
function leakFinding(scope) {
  return {
    id: `FND-SECRET-${stableId3(scope)}`,
    rule_id: "GITLEAKS-SECRET",
    severity: "P1",
    category: "secret-exposure",
    message: `Gitleaks reported one or more potential secrets in the ${scope}. The location and value are deliberately not recorded.`,
    status: "OPEN",
    evidence_refs: [IDENTITY.evidenceId],
    confidence: 0.7,
    remediation: scope === "git history" ? "Run gitleaks locally to locate the match, treat the credential as compromised and rotate or revoke it. Removing it from history does not make it safe." : "Run gitleaks locally to locate the match, remove it, and rotate or revoke the credential. Treat it as compromised until proven otherwise."
  };
}
async function runGitleaksAdapter(snapshot, runner, fingerprint) {
  if (snapshot.files.length === 0) return void 0;
  const conclude = (outcome) => concludeScanner(IDENTITY, outcome, fingerprint);
  const command = ["gitleaks", "dir", ...COMMON_ARGS, "."];
  if (!await runner.isAvailable("gitleaks", snapshot.rootPath, ".")) {
    const limitation = "gitleaks is not installed or not on PATH.";
    return conclude({
      status: "UNSUPPORTED",
      summary: "gitleaks was not available; the repository was not scanned for secrets.",
      findings: [],
      limitations: [limitation],
      command
    });
  }
  const version = await runner.getVersion?.("gitleaks", snapshot.rootPath, ".");
  const scan = async (scope) => runner.run(
    "gitleaks",
    [scope === "working tree" ? "dir" : "git", ...COMMON_ARGS, "."],
    snapshot.rootPath,
    ".",
    TOOL_TIMEOUT_MS
  );
  let tree;
  try {
    tree = await scan("working tree");
  } catch (error) {
    const limitation = `gitleaks failed to run: ${error instanceof Error ? error.message : String(error)}`;
    return conclude({ status: "ERROR", summary: limitation, findings: [], limitations: [limitation], command });
  }
  let history;
  let historyFailure;
  try {
    history = await scan("git history");
  } catch (error) {
    historyFailure = `gitleaks failed to run on git history: ${error instanceof Error ? error.message : String(error)}`;
  }
  const results = {
    "working tree": classify(tree.exitCode, "working tree", tree.stderr),
    "git history": history ? classify(history.exitCode, "git history", history.stderr) : "error"
  };
  const findings = ["working tree", "git history"].filter((scope) => results[scope] === "leaks").map(leakFinding);
  const limitations = [];
  if (results["working tree"] === "error") {
    limitations.push(`gitleaks exited with code ${tree.exitCode} on the working tree${tree.exitCode === 0 ? " but reported errors" : ""}; the result cannot be trusted.`);
  }
  if (results["git history"] === "unavailable") {
    limitations.push("git history could not be scanned (not a git repository, or a tool error).");
  } else if (results["git history"] === "error") {
    limitations.push(historyFailure ?? `gitleaks exited with code ${history?.exitCode} on git history${history?.exitCode === 0 ? " but reported errors" : ""}; the result cannot be trusted.`);
  } else if (results["git history"] === "clean") {
    limitations.push("Only the git history present in this clone was scanned; a shallow clone has less.");
  }
  const status = findings.length > 0 ? "FAIL" : results["working tree"] === "error" || results["git history"] === "error" ? "ERROR" : results["git history"] === "unavailable" ? "UNVERIFIED" : "PASS";
  const summary = {
    FAIL: `Gitleaks reported potential secrets in: ${findings.length === 2 ? "the working tree and git history" : results["working tree"] === "leaks" ? "the working tree" : "git history"}.`,
    ERROR: "Gitleaks produced a result that cannot be trusted; secrets were not verified.",
    UNVERIFIED: "Gitleaks found no secrets in the working tree, but git history could not be scanned.",
    PASS: "Gitleaks found no secrets in the working tree or the available git history. This does not prove the absence of secrets the rule set does not know."
  }[status];
  return conclude({
    status,
    summary,
    findings,
    limitations,
    // Report the exit code of the scope that decided the result, with the time spent on both.
    processResult: {
      ...results["working tree"] !== "clean" ? tree : history ?? tree,
      durationMs: (tree.durationMs ?? 0) + (history?.durationMs ?? 0)
    },
    ...version ? { version } : {},
    command
  });
}

// ../analyzer/src/osv.ts
var IDENTITY2 = {
  tool: "osv-scanner",
  adapterId: "osv-dependency-scan",
  adapterVersion: "0.1.0",
  capability: "verification:osv-dependency-scan",
  evidenceId: "EVD-OSV-DEPENDENCIES",
  evidenceSource: "osv-scanner-adapter"
};
var EVIDENCE_ID = IDENTITY2.evidenceId;
var MAX_LOCKFILES = 50;
var TOOL_TIMEOUT_MS2 = 12e4;
var NODE_LOCKFILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
var PYTHON_LOCKFILES = ["poetry.lock", "Pipfile.lock", "requirements.txt"];
var NODE_MANIFESTS = ["package.json"];
var PYTHON_MANIFESTS = ["pyproject.toml", "Pipfile"];
var severityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
var SEVERITY_LABELS = {
  CRITICAL: "P1",
  HIGH: "P1",
  MODERATE: "P2",
  MEDIUM: "P2",
  LOW: "P3"
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function withinDirectory(directory, ancestor) {
  return ancestor === "." || directory === ancestor || directory.startsWith(`${ancestor}/`);
}
function discoverLockfiles(files) {
  const candidates = files.filter((file) => !file.split("/").includes("node_modules"));
  const lockfiles = candidates.filter((file) => NODE_LOCKFILES.includes(basename(file)) || PYTHON_LOCKFILES.includes(basename(file))).sort();
  const nodeLockDirs = lockfiles.filter((file) => NODE_LOCKFILES.includes(basename(file))).map(directoryname);
  const pythonLockDirs = lockfiles.filter((file) => PYTHON_LOCKFILES.includes(basename(file))).map(directoryname);
  const uncovered = candidates.filter((file) => {
    const directory = directoryname(file);
    if (NODE_MANIFESTS.includes(basename(file))) return !nodeLockDirs.some((lock) => withinDirectory(directory, lock));
    if (PYTHON_MANIFESTS.includes(basename(file))) return !pythonLockDirs.some((lock) => withinDirectory(directory, lock));
    return false;
  }).sort();
  return { lockfiles, uncovered };
}
function parseOsvOutput(stdout) {
  const parsed = JSON.parse(stdout);
  if (!isRecord(parsed) || !Array.isArray(parsed.results)) {
    throw new Error("OSV-Scanner output has no results array.");
  }
  const packages = [];
  for (const result of parsed.results) {
    if (!isRecord(result)) throw new Error("OSV-Scanner result entry is not an object.");
    const source = isRecord(result.source) && typeof result.source.path === "string" ? result.source.path : "unknown";
    if (result.packages !== void 0 && !Array.isArray(result.packages)) {
      throw new Error("OSV-Scanner result packages is not an array.");
    }
    for (const entry of result.packages ?? []) {
      if (!isRecord(entry) || !isRecord(entry.package)) throw new Error("OSV-Scanner package entry is malformed.");
      const { name, version, ecosystem } = entry.package;
      if (typeof name !== "string" || typeof version !== "string" || typeof ecosystem !== "string") {
        throw new Error("OSV-Scanner package is missing name, version or ecosystem.");
      }
      if (entry.vulnerabilities !== void 0 && !Array.isArray(entry.vulnerabilities)) {
        throw new Error("OSV-Scanner package vulnerabilities is not an array.");
      }
      const vulnerabilities = (entry.vulnerabilities ?? []).map((vulnerability) => {
        if (!isRecord(vulnerability) || typeof vulnerability.id !== "string") {
          throw new Error("OSV-Scanner vulnerability has no id.");
        }
        const label = isRecord(vulnerability.database_specific) && typeof vulnerability.database_specific.severity === "string" ? vulnerability.database_specific.severity : void 0;
        return {
          id: vulnerability.id,
          ...typeof vulnerability.summary === "string" ? { summary: vulnerability.summary } : {},
          ...label !== void 0 ? { label } : {}
        };
      });
      if (entry.groups !== void 0 && !Array.isArray(entry.groups)) {
        throw new Error("OSV-Scanner package groups is not an array.");
      }
      const groups = (entry.groups ?? []).map((group) => {
        if (!isRecord(group) || !Array.isArray(group.ids) || group.ids.some((id) => typeof id !== "string")) {
          throw new Error("OSV-Scanner group has no ids.");
        }
        const score = typeof group.max_severity === "string" || typeof group.max_severity === "number" ? Number(group.max_severity) : NaN;
        return { ids: group.ids, ...Number.isFinite(score) && score >= 0 && score <= 10 ? { score } : {} };
      });
      packages.push({ source, name, version, ecosystem, vulnerabilities, groups });
    }
  }
  return packages;
}
function advisoryGroups(pkg) {
  const byId = new Map(pkg.vulnerabilities.map((vulnerability) => [vulnerability.id, vulnerability]));
  const used = /* @__PURE__ */ new Set();
  const advisories = [];
  for (const group of pkg.groups) {
    const members = group.ids.filter((id) => byId.has(id) && !used.has(id));
    if (members.length === 0) continue;
    for (const id of members) used.add(id);
    advisories.push({ members: members.map((id) => byId.get(id)), ...group.score !== void 0 ? { score: group.score } : {} });
  }
  for (const vulnerability of pkg.vulnerabilities) {
    if (!used.has(vulnerability.id)) advisories.push({ members: [vulnerability] });
  }
  return advisories;
}
function severityFromScore(score) {
  if (score >= 7) return "P1";
  if (score >= 4) return "P2";
  if (score > 0) return "P3";
  return void 0;
}
function groupSeverity(advisory) {
  const candidates = [];
  for (const vulnerability of advisory.members) {
    const severity = vulnerability.label ? SEVERITY_LABELS[vulnerability.label.trim().toUpperCase()] : void 0;
    if (severity) candidates.push(severity);
  }
  const fromScore = advisory.score !== void 0 ? severityFromScore(advisory.score) : void 0;
  if (fromScore) candidates.push(fromScore);
  const worst = candidates.sort((a, b) => severityRank[a] - severityRank[b])[0];
  return worst ? { severity: worst, established: true } : { severity: "P1", established: false };
}
function relativeSource(source, rootPath) {
  const normalized = source.replaceAll("\\", "/");
  const root = rootPath.replaceAll("\\", "/").replace(/\/+$/, "");
  return root && normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
}
function oneLine(value, limit) {
  return value.replace(/\s+/g, " ").trim().slice(0, limit);
}
function advisoryFindings(packages, rootPath) {
  const findings = [];
  for (const pkg of packages) {
    for (const advisory of advisoryGroups(pkg)) {
      const ids = advisory.members.map((vulnerability) => vulnerability.id).sort();
      const { severity, established } = groupSeverity(advisory);
      const summary = advisory.members.find((vulnerability) => vulnerability.summary)?.summary;
      const file = relativeSource(pkg.source, rootPath);
      findings.push({
        id: `FND-OSV-${stableId3(`${file}:${pkg.ecosystem}:${pkg.name}:${pkg.version}:${ids.join(",")}`)}`,
        rule_id: "OSV-ADVISORY",
        severity,
        category: "dependency-vulnerability",
        message: `${pkg.name}@${pkg.version} (${pkg.ecosystem}) is affected by ${ids.join(", ")}${summary ? `: ${oneLine(summary, 200)}` : ""}${established ? "" : ". Severity could not be established from the advisory and is treated as P1"}.`,
        status: "OPEN",
        evidence_refs: [EVIDENCE_ID],
        source_location: { file },
        confidence: 0.9,
        remediation: "Upgrade or replace the dependency, or record an approved governance exception. A local ignore entry is not accepted as a waiver."
      });
    }
  }
  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id));
}
async function runOsvAdapter(snapshot, runner, fingerprint) {
  const files = snapshot.files.map((file) => file.replaceAll("\\", "/"));
  const { lockfiles, uncovered } = discoverLockfiles(files);
  if (lockfiles.length === 0 && uncovered.length === 0) return void 0;
  const conclude = (outcome) => concludeScanner(IDENTITY2, outcome, fingerprint);
  const command = ["osv-scanner", "scan", "source", "--format", "json", `<${lockfiles.length} lockfiles>`];
  const coverageGap = uncovered.length > 0 ? [`No lockfile covers: ${uncovered.slice(0, 10).join(", ")}${uncovered.length > 10 ? ", ..." : ""}. Their dependencies were not scanned.`] : [];
  const notRun = (status2, summary2, limitations) => conclude({ status: status2, summary: summary2, findings: [], limitations, command });
  if (lockfiles.length === 0) {
    return notRun("UNSUPPORTED", "Dependency manifests were found, but no supported lockfile; dependencies were not scanned.", coverageGap);
  }
  if (lockfiles.length > MAX_LOCKFILES) {
    return notRun("SKIPPED", `Found ${lockfiles.length} lockfiles; the safety limit is ${MAX_LOCKFILES}.`, ["Not all lockfiles were scanned.", ...coverageGap]);
  }
  if (!await runner.isAvailable("osv-scanner", snapshot.rootPath, ".")) {
    return notRun("UNSUPPORTED", "osv-scanner was not available; dependency vulnerabilities were not scanned.", ["osv-scanner is not installed or not on PATH.", ...coverageGap]);
  }
  const version = await runner.getVersion?.("osv-scanner", snapshot.rootPath, ".");
  let processResult;
  try {
    processResult = await runner.run(
      "osv-scanner",
      ["scan", "source", "--format", "json", ...lockfiles.map((file) => `--lockfile=${file}`)],
      snapshot.rootPath,
      ".",
      TOOL_TIMEOUT_MS2
    );
  } catch (error) {
    const limitation = `osv-scanner failed to run: ${error instanceof Error ? error.message : String(error)}`;
    return notRun("ERROR", limitation, [limitation, ...coverageGap]);
  }
  const ranOutcome = (status2, summary2, findings2, limitations) => conclude({ status: status2, summary: summary2, findings: findings2, limitations, processResult, command, ...version ? { version } : {} });
  const untrusted = (reason) => ranOutcome("ERROR", `${reason} Dependency scan could not be trusted.`, [], [reason, ...coverageGap]);
  if (processResult.exitCode === 128) {
    return ranOutcome("UNVERIFIED", "osv-scanner found no packages in the lockfiles; nothing was verified.", [], ["osv-scanner reported no packages found (exit 128).", ...coverageGap]);
  }
  if (processResult.exitCode !== 0 && processResult.exitCode !== 1) {
    const detail = compactOutput("", processResult.stderr).slice(0, 500);
    return untrusted(`osv-scanner exited with code ${processResult.exitCode}${detail ? `: ${detail}` : "."}`);
  }
  let packages;
  try {
    packages = parseOsvOutput(processResult.stdout);
  } catch (error) {
    return untrusted(`osv-scanner output could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const findings = advisoryFindings(packages, snapshot.rootPath);
  if (processResult.exitCode === 0 && findings.length > 0 || processResult.exitCode === 1 && findings.length === 0) {
    return untrusted(`osv-scanner exit code ${processResult.exitCode} contradicts its output (${findings.length} advisories).`);
  }
  const counts = (severity) => findings.filter((finding) => finding.severity === severity).length;
  const tally = `${findings.length} advisories (P1: ${counts("P1")}, P2: ${counts("P2")}, P3: ${counts("P3")})`;
  const status = counts("P1") > 0 ? "FAIL" : coverageGap.length > 0 ? "UNVERIFIED" : findings.length > 0 ? "WARN" : "PASS";
  const summary = {
    FAIL: `Dependency scan found ${tally}; at least one is P1.`,
    UNVERIFIED: `Dependency scan found ${tally}, but some manifests are not covered by a lockfile.`,
    WARN: `Dependency scan found ${tally}; none is P1.`,
    PASS: `Dependency scan found no known vulnerabilities in ${lockfiles.length} lockfile(s).`
  }[status];
  return ranOutcome(status, summary, findings, coverageGap);
}

// ../analyzer/src/semgrep.ts
import { createHash as createHash2 } from "node:crypto";
var SEMGREP_RULES_DIRECTORY = ".governance/semgrep";
var IDENTITY3 = {
  tool: "semgrep",
  adapterId: "semgrep-static-analysis",
  adapterVersion: "0.1.0",
  capability: "verification:semgrep-static-analysis",
  evidenceId: "EVD-SEMGREP-STATIC-ANALYSIS",
  evidenceSource: "semgrep-adapter"
};
var TOOL_TIMEOUT_MS3 = 3e5;
var SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|py)$/;
var RULE_FILE = /\.ya?ml$/;
var severityRank2 = { P0: 0, P1: 1, P2: 2, P3: 3 };
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseSemgrepOutput(stdout) {
  const parsed = JSON.parse(stdout);
  if (!isRecord2(parsed) || !Array.isArray(parsed.results) || !Array.isArray(parsed.errors)) {
    throw new Error("Semgrep output has no results and errors arrays.");
  }
  const matches = parsed.results.map((entry) => {
    if (!isRecord2(entry) || !isRecord2(entry.extra) || !isRecord2(entry.start)) {
      throw new Error("Semgrep result entry is malformed.");
    }
    const { check_id: checkId, path: path12 } = entry;
    const { message, severity } = entry.extra;
    const { line } = entry.start;
    if (typeof checkId !== "string" || typeof path12 !== "string" || typeof message !== "string" || typeof severity !== "string" || typeof line !== "number") {
      throw new Error("Semgrep result is missing check_id, path, line, message or severity.");
    }
    return { checkId, path: path12, line, message, severity };
  });
  return { matches, scanErrors: parsed.errors.length };
}
function severityFor(semgrepSeverity) {
  switch (semgrepSeverity.toUpperCase()) {
    case "ERROR":
      return "P1";
    case "WARNING":
      return "P2";
    case "INFO":
      return "INFO";
    default:
      return "P1";
  }
}
function toFinding(match, severity) {
  const file = match.path.replaceAll("\\", "/");
  return {
    id: `FND-SEMGREP-${stableId3(`${match.checkId}:${file}:${match.line}`)}`,
    rule_id: match.checkId.slice(0, 200),
    severity,
    category: "static-analysis",
    message: match.message.replace(/\s+/g, " ").trim().slice(0, 300),
    status: "OPEN",
    evidence_refs: [IDENTITY3.evidenceId],
    source_location: { file, start_line: match.line },
    confidence: 0.8,
    remediation: "Fix the flagged code, or record an approved governance exception. A nosemgrep comment or local ignore is not accepted as a waiver."
  };
}
function ruleSetDigest(ruleFiles, contents) {
  if (!contents || ruleFiles.some((file) => contents[file] === void 0)) return void 0;
  const hash = createHash2("sha256");
  for (const file of ruleFiles) hash.update(`${file}\0${contents[file]}
`);
  return `sha256:${hash.digest("hex")}`;
}
async function runSemgrepAdapter(snapshot, runner, fingerprint) {
  const files = snapshot.files.map((file) => file.replaceAll("\\", "/"));
  const ruleFiles = files.filter((file) => file.startsWith(`${SEMGREP_RULES_DIRECTORY}/`) && RULE_FILE.test(file)).sort();
  const sourceFiles = files.filter(
    (file) => SOURCE_FILE.test(file) && !file.split("/").includes("node_modules") && !file.startsWith(`${SEMGREP_RULES_DIRECTORY}/`)
  );
  if (sourceFiles.length === 0) return void 0;
  const conclude = (outcome) => concludeScanner(IDENTITY3, outcome, fingerprint);
  const command = [
    "semgrep",
    "scan",
    "--json",
    "--error",
    "--quiet",
    "--metrics=off",
    "--disable-version-check",
    `--config=${SEMGREP_RULES_DIRECTORY}`,
    `--exclude=${SEMGREP_RULES_DIRECTORY}`,
    "."
  ];
  if (ruleFiles.length === 0) {
    return conclude({
      status: "UNSUPPORTED",
      summary: `Source code was found, but no reviewed Semgrep rule set exists at ${SEMGREP_RULES_DIRECTORY}/; static analysis was not run.`,
      findings: [],
      limitations: [`Add reviewed rules as .yml files under ${SEMGREP_RULES_DIRECTORY}/. Registry rules are never used.`],
      command
    });
  }
  if (!await runner.isAvailable("semgrep", snapshot.rootPath, ".")) {
    return conclude({
      status: "UNSUPPORTED",
      summary: "semgrep was not available; static analysis was not run.",
      findings: [],
      limitations: ["semgrep is not installed or not on PATH."],
      command
    });
  }
  const version = await runner.getVersion?.("semgrep", snapshot.rootPath, ".");
  let processResult;
  try {
    processResult = await runner.run("semgrep", command.slice(1), snapshot.rootPath, ".", TOOL_TIMEOUT_MS3);
  } catch (error) {
    const limitation = `semgrep failed to run: ${error instanceof Error ? error.message : String(error)}`;
    return conclude({ status: "ERROR", summary: limitation, findings: [], limitations: [limitation], command });
  }
  const ran = (status2, summary2, findings2, limitations2) => conclude({ status: status2, summary: summary2, findings: findings2, limitations: limitations2, processResult, command, ...version ? { version } : {} });
  const untrusted = (reason) => ran("ERROR", `${reason} Static analysis could not be trusted.`, [], [reason]);
  if (processResult.exitCode !== 0 && processResult.exitCode !== 1) {
    const detail = compactOutput("", processResult.stderr).slice(0, 500);
    return untrusted(`semgrep exited with code ${processResult.exitCode}${detail ? `: ${detail}` : "."}`);
  }
  let parsed;
  try {
    parsed = parseSemgrepOutput(processResult.stdout);
  } catch (error) {
    return untrusted(`semgrep output could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const classified = parsed.matches.map((match) => ({ match, severity: severityFor(match.severity) }));
  const findings = classified.filter((item) => item.severity !== "INFO").map((item) => toFinding(item.match, item.severity)).sort((a, b) => severityRank2[a.severity] - severityRank2[b.severity] || a.id.localeCompare(b.id));
  const infoCount = classified.length - findings.length;
  if (processResult.exitCode === 0 && classified.length > 0 || processResult.exitCode === 1 && classified.length === 0) {
    return untrusted(`semgrep exit code ${processResult.exitCode} contradicts its output (${classified.length} matches).`);
  }
  const digest = ruleSetDigest(ruleFiles, snapshot.fileContents);
  const limitations = [
    ...digest ? [] : ["The rule set content was not ingested, so its digest could not be recorded."],
    ...parsed.scanErrors > 0 ? [`Semgrep reported ${parsed.scanErrors} scan error(s); some files may not have been analysed.`] : [],
    "Inline nosemgrep suppressions are not reported by Semgrep CE and cannot be counted."
  ];
  const p1 = findings.filter((finding) => finding.severity === "P1").length;
  const tally = `${findings.length} finding(s) (P1: ${p1}, P2: ${findings.length - p1}) and ${infoCount} informational match(es) not reported`;
  const status = p1 > 0 ? "FAIL" : parsed.scanErrors > 0 || !digest ? "UNVERIFIED" : findings.length > 0 ? "WARN" : "PASS";
  const summary = `Semgrep ran ${ruleFiles.length} rule file(s) (${digest ?? "digest unavailable"}) and reported ${tally}.${status === "UNVERIFIED" ? " Coverage or the rule-set record is incomplete." : ""}`;
  return ran(status, summary, findings, limitations);
}

// ../analyzer/src/verification.ts
var MAX_TYPESCRIPT_PROJECTS = 20;
var MAX_PYTHON_FILES = 500;
var TOOL_TIMEOUT_MS4 = 6e4;
function typescriptFindings(output, evidenceId) {
  const findings = [];
  const diagnosticPattern = /^(.+?)\((\d+),(\d+)\): error TS\d+: (.+)$/gm;
  for (const match of output.matchAll(diagnosticPattern)) {
    findings.push({
      id: `FND-TSC-${stableId3(`${match[1]}:${match[2]}:${match[3]}:${match[4]}`)}`,
      rule_id: "TSC-TYPECHECK",
      severity: "P1",
      category: "static-analysis",
      message: match[4] ?? "TypeScript compiler reported an error.",
      status: "OPEN",
      evidence_refs: [evidenceId],
      source_location: {
        file: match[1] ?? "unknown",
        start_line: Number(match[2]),
        start_column: Number(match[3])
      },
      confidence: 0.98,
      remediation: "Resolve the TypeScript compiler diagnostic and rerun the type check."
    });
  }
  if (findings.length === 0 && output.trim()) {
    findings.push({
      id: `FND-TSC-${stableId3(output)}`,
      rule_id: "TSC-TYPECHECK",
      severity: "P1",
      category: "static-analysis",
      message: output.trim().slice(0, 1e3),
      status: "OPEN",
      evidence_refs: [evidenceId],
      confidence: 0.9,
      remediation: "Review the TypeScript compiler output and resolve the reported failure."
    });
  }
  return findings;
}
function pythonFindings(errors, evidenceId) {
  return errors.map((error, index) => ({
    id: `FND-PY-SYNTAX-${stableId3(`${error.file ?? "unknown"}:${error.line ?? 0}:${error.message ?? index}`)}`,
    rule_id: "PYTHON-SYNTAX",
    severity: "P1",
    category: "static-analysis",
    message: `${error.message ?? "Python syntax error"} (${error.file ?? "unknown"})`,
    status: "OPEN",
    evidence_refs: [evidenceId],
    ...error.file ? {
      source_location: {
        file: error.file,
        ...error.line ? { start_line: error.line } : {}
      }
    } : {},
    confidence: 0.98,
    remediation: "Correct the Python syntax error and rerun syntax verification."
  }));
}
async function runVerificationAdapters(snapshot, runner) {
  const snapshotFingerprint = fingerprintRepositorySnapshot(snapshot);
  const results = [];
  const evidence = [];
  const findings = [];
  const adapterResults = [];
  const files = snapshot.files.map((file) => file.replaceAll("\\", "/"));
  const pythonCandidates = files.filter((file) => file.endsWith(".py")).sort();
  const pythonFiles = pythonCandidates.filter((file) => snapshot.fileContents?.[file] !== void 0);
  const uninspectedPythonFiles = pythonCandidates.filter((file) => snapshot.fileContents?.[file] === void 0);
  const typescriptFiles = files.filter((file) => /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(file)).sort();
  const tsconfigs = files.filter((file) => basename(file) === "tsconfig.json").sort();
  if (typescriptFiles.length > 0) {
    const evidenceId = "EVD-TSC-TYPECHECK";
    if (tsconfigs.length === 0) {
      results.push({
        tool: "typescript",
        status: "UNSUPPORTED",
        command: ["tsc", "--noEmit"],
        summary: "TypeScript files were found, but no tsconfig.json was discovered.",
        findings: [],
        limitations: ["TypeScript type checking requires a project configuration; no compiler command was executed."]
      });
      adapterResults.push({
        adapterId: "typescript-typecheck",
        version: "0.1.0",
        executionStatus: "PARTIAL",
        supportedCapabilities: [],
        unsupportedCapabilities: ["verification:typescript-typecheck"],
        evidenceRefs: [],
        limitations: ["No tsconfig.json was found; TypeScript type checking was not run."]
      });
    } else if (tsconfigs.length > MAX_TYPESCRIPT_PROJECTS) {
      results.push({
        tool: "typescript",
        status: "SKIPPED",
        command: ["tsc", "--noEmit"],
        summary: `Found ${tsconfigs.length} TypeScript projects; the safety limit is ${MAX_TYPESCRIPT_PROJECTS}.`,
        findings: [],
        limitations: ["Not all TypeScript projects were verified."]
      });
      adapterResults.push({
        adapterId: "typescript-typecheck",
        version: "0.1.0",
        executionStatus: "PARTIAL",
        supportedCapabilities: [],
        unsupportedCapabilities: ["verification:typescript-project-limit"],
        evidenceRefs: [],
        limitations: ["TypeScript project count exceeded the verification limit."]
      });
    } else {
      const unavailable = [];
      const processResults = [];
      const errors = [];
      const toolVersions = /* @__PURE__ */ new Set();
      for (const configPath of tsconfigs) {
        const workingDirectory = directoryname(configPath);
        if (!await runner.isAvailable("typescript", snapshot.rootPath, workingDirectory)) {
          unavailable.push(configPath);
          continue;
        }
        try {
          const version = await runner.getVersion?.("typescript", snapshot.rootPath, workingDirectory);
          if (version) toolVersions.add(version);
          processResults.push(await runner.run(
            "typescript",
            ["--noEmit", "--pretty", "false", "--project", "tsconfig.json"],
            snapshot.rootPath,
            workingDirectory,
            TOOL_TIMEOUT_MS4
          ));
        } catch (error) {
          errors.push(`${configPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (processResults.length === 0) {
        const limitations = [
          ...unavailable.length ? [`TypeScript compiler unavailable for: ${unavailable.join(", ")}.`] : [],
          ...errors
        ];
        results.push({
          tool: "typescript",
          status: errors.length > 0 ? "ERROR" : "UNSUPPORTED",
          command: ["tsc", "--noEmit", "--pretty", "false"],
          summary: limitations.join(" ") || "No TypeScript project could be verified.",
          findings: [],
          limitations
        });
        adapterResults.push({
          adapterId: "typescript-typecheck",
          version: "0.1.0",
          executionStatus: errors.length > 0 ? "FAILED" : "PARTIAL",
          supportedCapabilities: [],
          unsupportedCapabilities: ["verification:typescript-typecheck"],
          evidenceRefs: [],
          limitations
        });
      } else {
        const failures = processResults.filter((result) => result.exitCode !== 0);
        const output = processResults.map((result) => compactOutput(result.stdout, result.stderr)).filter(Boolean).join("\n");
        const toolFindings = failures.flatMap((result) => typescriptFindings(
          compactOutput(result.stdout, result.stderr) || `TypeScript compiler exited with code ${result.exitCode} without diagnostics.`,
          evidenceId
        ));
        const limitations = [
          ...unavailable.map((configPath) => `TypeScript compiler unavailable for ${configPath}.`),
          ...errors
        ];
        const hasLimitations = limitations.length > 0;
        const status2 = failures.length > 0 ? "FAIL" : hasLimitations ? "UNVERIFIED" : "PASS";
        const toolEvidence = {
          id: evidenceId,
          type: "E3_AUTOMATED_ANALYSIS",
          status: evidenceStatusForResult(status2),
          result_status: status2,
          description: failures.length > 0 ? `TypeScript type checking failed in ${failures.length} project(s).` : hasLimitations ? `TypeScript type checking completed for ${processResults.length} project(s), but some projects were not verified.` : `TypeScript type checking passed for ${tsconfigs.length} project(s).`,
          source: "typescript-compiler-adapter",
          freshness: "current",
          supports_controls: [],
          generated_at: (/* @__PURE__ */ new Date()).toISOString(),
          repository_fingerprint: snapshotFingerprint.digest,
          ...toolVersions.size > 0 ? { tool_version: [...toolVersions].sort().join(", ") } : {},
          ...processResults.some((result) => result.durationMs !== void 0) ? { duration_ms: processResults.reduce((total, result) => total + (result.durationMs ?? 0), 0) } : {},
          ...failures.length > 0 ? { exit_code: 1 } : hasLimitations ? {} : { exit_code: 0 },
          command: ["tsc", "--noEmit", "--pretty", "false", "--project", "tsconfig.json"]
        };
        evidence.push(toolEvidence);
        findings.push(...toolFindings);
        results.push({
          tool: "typescript",
          status: status2,
          command: ["tsc", "--noEmit", "--pretty", "false", "--project", "<each tsconfig.json>"],
          ...failures.length > 0 ? { exitCode: 1 } : hasLimitations ? {} : { exitCode: 0 },
          summary: failures.length > 0 ? `TypeScript type checking failed in ${failures.length} project(s).` : hasLimitations ? "TypeScript type checking is incomplete; one or more projects could not be verified." : "TypeScript type checking passed.",
          evidenceId,
          ...toolVersions.size > 0 ? { toolVersion: [...toolVersions].sort().join(", ") } : {},
          findings: toolFindings,
          limitations
        });
        adapterResults.push({
          adapterId: "typescript-typecheck",
          version: "0.1.0",
          executionStatus: hasLimitations ? "PARTIAL" : "SUCCESS",
          supportedCapabilities: ["verification:typescript-typecheck"],
          unsupportedCapabilities: hasLimitations ? ["verification:typescript-project-execution"] : [],
          evidenceRefs: [evidenceId],
          limitations
        });
        if (output && failures.length > 0) {
          results[results.length - 1].summary += ` Diagnostics: ${output.slice(0, 1e3)}`;
        }
      }
    }
  }
  if (pythonCandidates.length > 0) {
    const evidenceId = "EVD-PYTHON-SYNTAX";
    if (pythonCandidates.length > MAX_PYTHON_FILES) {
      results.push({
        tool: "python",
        status: "SKIPPED",
        command: ["python", "-c", "ast.parse(...)"],
        summary: `Found ${pythonFiles.length} Python files; the safety limit is ${MAX_PYTHON_FILES}.`,
        findings: [],
        limitations: ["Not all Python files were verified."]
      });
      adapterResults.push({
        adapterId: "python-syntax",
        version: "0.1.0",
        executionStatus: "PARTIAL",
        supportedCapabilities: [],
        unsupportedCapabilities: ["verification:python-file-limit"],
        evidenceRefs: [],
        limitations: ["Python file count exceeded the verification limit."]
      });
    } else if (pythonFiles.length === 0) {
      const limitation = "Python source content was not ingested within the repository scan limits; syntax was not checked.";
      results.push({
        tool: "python",
        status: "SKIPPED",
        command: ["python", "-c", "ast.parse(...)"],
        summary: limitation,
        findings: [],
        limitations: [limitation]
      });
      adapterResults.push({
        adapterId: "python-syntax",
        version: "0.1.0",
        executionStatus: "PARTIAL",
        supportedCapabilities: [],
        unsupportedCapabilities: ["verification:python-source-content"],
        evidenceRefs: [],
        limitations: [limitation]
      });
    } else {
      const tool = await runner.isAvailable("python3", snapshot.rootPath, ".") ? "python3" : await runner.isAvailable("python", snapshot.rootPath, ".") ? "python" : void 0;
      if (!tool) {
        const limitation = "Neither python3 nor python was available; Python syntax was not checked.";
        results.push({
          tool: "python",
          status: "UNSUPPORTED",
          command: ["python", "-c", "ast.parse(...)"],
          summary: limitation,
          findings: [],
          limitations: [limitation]
        });
        adapterResults.push({
          adapterId: "python-syntax",
          version: "0.1.0",
          executionStatus: "PARTIAL",
          supportedCapabilities: [],
          unsupportedCapabilities: ["verification:python-syntax"],
          evidenceRefs: [],
          limitations: [limitation]
        });
      } else {
        const toolVersion = await runner.getVersion?.(tool, snapshot.rootPath, ".");
        const script = [
          "import ast, json, pathlib, sys",
          "errors = []",
          "for name in sys.argv[1:]:",
          " try:",
          "  ast.parse(pathlib.Path(name).read_text(encoding='utf-8'), filename=name)",
          " except (SyntaxError, UnicodeError, OSError) as exc:",
          "  errors.append({'file': name, 'line': getattr(exc, 'lineno', None), 'message': str(exc)})",
          "print(json.dumps({'errors': errors}))",
          "sys.exit(1 if errors else 0)"
        ].join("\n");
        try {
          const processResult = await runner.run(
            tool,
            ["-c", script, ...pythonFiles],
            snapshot.rootPath,
            ".",
            TOOL_TIMEOUT_MS4
          );
          let parsedErrors = [];
          let invalidToolOutput = false;
          try {
            const parsed = JSON.parse(processResult.stdout);
            if (!parsed || !Array.isArray(parsed.errors)) throw new Error("Python syntax runner returned an invalid result shape.");
            parsedErrors = parsed.errors;
          } catch {
            invalidToolOutput = true;
            if (processResult.exitCode !== 0) {
              parsedErrors = [{
                message: compactOutput(processResult.stdout, processResult.stderr) || "Python syntax verification failed without diagnostics."
              }];
            }
          }
          const contradictoryExit = processResult.exitCode === 0 && parsedErrors.length > 0 || processResult.exitCode !== 0 && parsedErrors.length === 0;
          const status2 = invalidToolOutput || contradictoryExit ? "ERROR" : processResult.exitCode !== 0 ? "FAIL" : uninspectedPythonFiles.length > 0 ? "UNVERIFIED" : "PASS";
          const toolFindings = status2 === "FAIL" ? pythonFindings(parsedErrors, evidenceId) : [];
          evidence.push({
            id: evidenceId,
            type: "E3_AUTOMATED_ANALYSIS",
            status: evidenceStatusForResult(status2),
            result_status: status2,
            description: status2 === "PASS" ? `Python syntax verification passed for ${pythonFiles.length} file(s).` : status2 === "FAIL" ? `Python syntax verification found ${parsedErrors.length || 1} failure(s).` : status2 === "UNVERIFIED" ? `Python syntax was checked for ${pythonFiles.length} file(s), but ${uninspectedPythonFiles.length} file(s) were not inspected.` : "Python syntax runner returned invalid output; verification could not be trusted.",
            source: "python-ast-adapter",
            freshness: "current",
            supports_controls: [],
            generated_at: (/* @__PURE__ */ new Date()).toISOString(),
            repository_fingerprint: snapshotFingerprint.digest,
            ...toolVersion ? { tool_version: toolVersion } : {},
            ...processResult.durationMs !== void 0 ? { duration_ms: processResult.durationMs } : {},
            exit_code: processResult.exitCode,
            command: [tool, "-c", "<inline AST parser>", `<${pythonFiles.length} source files>`]
          });
          findings.push(...toolFindings);
          results.push({
            tool: "python",
            status: status2,
            command: [tool, "-c", "ast.parse(...)", `<${pythonFiles.length} source files>`],
            exitCode: processResult.exitCode,
            summary: status2 === "PASS" ? `Python syntax passed for ${pythonFiles.length} file(s).` : status2 === "FAIL" ? `Python syntax failed for ${parsedErrors.length || 1} file(s).` : status2 === "UNVERIFIED" ? `Python syntax verification incomplete: ${uninspectedPythonFiles.length} file(s) were not inspected.` : "Python syntax runner returned invalid output.",
            evidenceId,
            ...toolVersion ? { toolVersion } : {},
            findings: toolFindings,
            limitations: [
              ...status2 === "ERROR" ? ["Python syntax runner returned malformed output or output inconsistent with its exit code."] : [],
              ...uninspectedPythonFiles.length > 0 ? [`Source content was not ingested for: ${uninspectedPythonFiles.slice(0, 10).join(", ")}.`] : []
            ]
          });
          adapterResults.push({
            adapterId: "python-syntax",
            version: "0.1.0",
            executionStatus: status2 === "ERROR" ? "FAILED" : uninspectedPythonFiles.length > 0 ? "PARTIAL" : "SUCCESS",
            supportedCapabilities: status2 === "ERROR" ? [] : ["verification:python-syntax"],
            unsupportedCapabilities: [
              ...status2 === "ERROR" ? ["verification:python-syntax-output"] : [],
              ...uninspectedPythonFiles.length > 0 ? ["verification:python-source-content"] : []
            ],
            evidenceRefs: [evidenceId],
            limitations: [
              ...status2 === "ERROR" ? ["Python syntax runner returned malformed output or output inconsistent with its exit code."] : [],
              ...uninspectedPythonFiles.length > 0 ? [`Source content was not ingested for: ${uninspectedPythonFiles.slice(0, 10).join(", ")}.`] : []
            ]
          });
        } catch (error) {
          const limitation = `Python syntax runner failed: ${error instanceof Error ? error.message : String(error)}`;
          results.push({
            tool: "python",
            status: "ERROR",
            command: [tool, "-c", "ast.parse(...)"],
            summary: limitation,
            findings: [],
            limitations: [limitation]
          });
          adapterResults.push({
            adapterId: "python-syntax",
            version: "0.1.0",
            executionStatus: "FAILED",
            supportedCapabilities: [],
            unsupportedCapabilities: ["verification:python-syntax"],
            evidenceRefs: [],
            limitations: [limitation]
          });
        }
      }
    }
  }
  for (const runScanner of [runOsvAdapter, runGitleaksAdapter, runSemgrepAdapter]) {
    const scan = await runScanner(snapshot, runner, snapshotFingerprint);
    if (!scan) continue;
    results.push(scan.result);
    evidence.push(...scan.evidence);
    findings.push(...scan.findings);
    adapterResults.push(scan.adapterResult);
  }
  const status = adapterResults.some((result) => result.executionStatus === "PARTIAL" || result.executionStatus === "FAILED") ? "PARTIAL" : "COMPLETE";
  return { status, results, evidence, findings, adapterResults, snapshotFingerprint };
}

// ../engine/src/authority.ts
var normalize = (value) => value.trim().replace(/^@/, "").toLowerCase();
function checkApproverAuthority(approver, claimedRole, severity, authority) {
  if (!claimedRole?.trim()) {
    return { authorized: false, reason: "the approval does not name the approver's authority role" };
  }
  const role = authority.find((candidate) => candidate.role === claimedRole);
  if (!role) {
    return { authorized: false, reason: `role ${claimedRole} is not an approved authority role` };
  }
  if (!role.severities.includes(severity)) {
    return { authorized: false, reason: `role ${role.role} may not approve ${severity} deviations` };
  }
  const approverKey = normalize(approver);
  if (!role.holders.some((holder) => normalize(holder) === approverKey)) {
    return { authorized: false, reason: `'${approver.trim()}' is not a holder of role ${role.role}` };
  }
  return { authorized: true, reason: `'${approver.trim()}' holds role ${role.role}, which may approve ${severity}` };
}

// ../engine/src/evaluator.ts
function normalizeConditions(appliesWhen) {
  if (!appliesWhen) return [];
  return Array.isArray(appliesWhen) ? appliesWhen : [appliesWhen];
}
function resolveControlApplicability(control, context) {
  const conditions = normalizeConditions(control.applies_when);
  if (conditions.length === 0) {
    return { status: "APPLICABLE", missingSignals: [] };
  }
  const signals = new Set(context.signals);
  const missingSignals = conditions.filter((condition) => !signals.has(condition));
  if (missingSignals.length === 0) {
    return { status: "APPLICABLE", missingSignals: [] };
  }
  if (context.analysisStatus === "COMPLETE") {
    return { status: "NOT_APPLICABLE", missingSignals };
  }
  return { status: "UNVERIFIED", missingSignals };
}
function evidenceIsUsable(control, item, evaluatedAt, repositoryFingerprint) {
  if (item.repository_fingerprint && repositoryFingerprint && item.repository_fingerprint !== repositoryFingerprint) return false;
  const legacyFreshness = item.freshness.trim().toLowerCase();
  if (item.status !== "VERIFIED" || item.freshness_status !== void 0 && item.freshness_status !== "current" || item.freshness_status === void 0 && ["stale", "expired", "unknown"].includes(legacyFreshness)) return false;
  const maxAgeSeconds = control.max_evidence_age_seconds;
  if (maxAgeSeconds === void 0) return true;
  if (!item.generated_at) return false;
  const generatedAt = Date.parse(item.generated_at);
  const assessmentTime = evaluatedAt ? Date.parse(evaluatedAt) : Date.now();
  if (!Number.isFinite(generatedAt) || !Number.isFinite(assessmentTime)) return false;
  const ageSeconds = (assessmentTime - generatedAt) / 1e3;
  return ageSeconds >= 0 && ageSeconds <= maxAgeSeconds;
}
function evidenceForControl(control, evidence, evaluatedAt, repositoryFingerprint) {
  const required = control.required_evidence ?? [];
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const missing = /* @__PURE__ */ new Set();
  const supporting = /* @__PURE__ */ new Set();
  const explicitlyLinked = evidence.filter((item) => item.supports_controls.includes(control.id));
  const evidenceIds = required.length > 0 ? required : explicitlyLinked.map((item) => item.id);
  if (evidenceIds.length === 0) {
    return { missing: [`EVIDENCE_REQUIRED:${control.id}`], supporting: [] };
  }
  for (const evidenceId of evidenceIds) {
    const item = byId.get(evidenceId);
    if (!item || !item.supports_controls.includes(control.id) || !evidenceIsUsable(control, item, evaluatedAt, repositoryFingerprint)) {
      missing.add(evidenceId);
      continue;
    }
    supporting.add(evidenceId);
  }
  for (const item of explicitlyLinked) {
    if (!evidenceIsUsable(control, item, evaluatedAt, repositoryFingerprint)) missing.add(item.id);
  }
  return { missing: [...missing].sort(), supporting: [...supporting].sort() };
}
function evaluateControl(control, evidence, context) {
  const applicability = resolveControlApplicability(control, context);
  const failureDecision = control.failure_decision ?? "NONE";
  if (applicability.status === "NOT_APPLICABLE") {
    return {
      controlId: control.id,
      applicable: false,
      applicabilityStatus: "NOT_APPLICABLE",
      status: "NOT_APPLICABLE",
      severity: control.severity,
      failureDecision,
      missingEvidence: [],
      missingSignals: applicability.missingSignals,
      supportingEvidence: [],
      reason: "Control conditions are absent and repository analysis completed successfully."
    };
  }
  const { missing, supporting } = evidenceForControl(control, evidence, context.evaluatedAt, context.repositoryFingerprint);
  if (applicability.status === "UNVERIFIED") {
    return {
      controlId: control.id,
      applicable: true,
      applicabilityStatus: "UNVERIFIED",
      status: control.status === "FAIL" ? "FAIL" : "UNVERIFIED",
      severity: control.severity,
      failureDecision,
      missingEvidence: missing,
      missingSignals: applicability.missingSignals,
      supportingEvidence: supporting,
      reason: `Control applicability could not be established because repository analysis is ${context.analysisStatus ?? "not declared"}. Missing signals: ${applicability.missingSignals.join(", ")}.`
    };
  }
  let status;
  if (control.status === "FAIL") {
    status = "FAIL";
  } else if (control.status === "WARN") {
    status = "WARN";
  } else if (control.status === "NOT_APPLICABLE") {
    status = "UNVERIFIED";
  } else if (missing.length > 0) {
    status = "UNVERIFIED";
  } else {
    status = "PASS";
  }
  let reason;
  if (control.status === "FAIL") {
    reason = control.message ?? `Control ${control.id} is explicitly marked as failed.`;
  } else if (control.status === "WARN") {
    reason = control.message ?? `Control ${control.id} requires review.`;
  } else if (control.status === "NOT_APPLICABLE") {
    reason = "Control is marked NOT_APPLICABLE but its applicability conditions are satisfied; verification is required.";
  } else if (missing.length > 0) {
    reason = `Required evidence is missing, stale, partial, unverified, or not applicable: ${missing.join(", ")}.`;
  } else {
    reason = `Verified evidence satisfies control ${control.id}.`;
  }
  return {
    controlId: control.id,
    applicable: true,
    applicabilityStatus: "APPLICABLE",
    status,
    severity: control.severity,
    failureDecision,
    missingEvidence: missing,
    missingSignals: [],
    supportingEvidence: supporting,
    reason
  };
}

// ../engine/src/decision.ts
var severityRank3 = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3
};
function toViolation(control, pack) {
  const definition = pack.controls.find((item) => item.id === control.controlId);
  return {
    controlId: control.controlId,
    status: control.status,
    severity: control.severity,
    decision: control.failureDecision,
    message: definition?.message ?? control.reason ?? `Control ${control.controlId} is ${control.status}.`,
    missingEvidence: control.missingEvidence,
    missingSignals: control.missingSignals
  };
}
function isRiskAcceptanceValid(risk, context) {
  if (risk.status !== "ACCEPTED" || !risk.accepted_by?.trim() || !risk.acceptance_reason?.trim() || !risk.accepted_at || !risk.acceptance_expires_at || !context.evaluatedAt) {
    return false;
  }
  const acceptedAt = Date.parse(risk.accepted_at);
  const expiresAt = Date.parse(risk.acceptance_expires_at);
  const evaluatedAt = Date.parse(context.evaluatedAt);
  if (Number.isNaN(acceptedAt) || Number.isNaN(expiresAt) || Number.isNaN(evaluatedAt)) {
    return false;
  }
  return acceptedAt <= evaluatedAt && evaluatedAt < expiresAt && acceptedAt < expiresAt;
}
function riskAcceptanceHolds(risk, context) {
  if (risk.status !== "ACCEPTED" || !isRiskAcceptanceValid(risk, context)) return false;
  if (risk.severity === "P0") return false;
  const authority = context.approverAuthority;
  if (authority && authority.length > 0) {
    return checkApproverAuthority(risk.accepted_by ?? "", risk.acceptance_role, risk.severity, authority).authorized;
  }
  return risk.severity === "P2" || risk.severity === "P3";
}
var EXPIRY_WARNING_DAYS = 14;
function expiryCountdown(expiresAt, evaluatedAt) {
  const days = daysUntil(expiresAt, evaluatedAt);
  return days === void 0 || days > EXPIRY_WARNING_DAYS ? "" : ` (expiring in ${days} day${days === 1 ? "" : "s"})`;
}
function daysUntil(timestamp, evaluatedAt) {
  const target = Date.parse(timestamp ?? "");
  const now = Date.parse(evaluatedAt ?? "");
  return Number.isNaN(target) || Number.isNaN(now) ? void 0 : Math.ceil((target - now) / 864e5);
}
function assessApprovedException(exception, pack, context) {
  if (exception.status !== "APPROVED") {
    return { valid: false, reason: "Exception is not approved." };
  }
  const control = pack.controls.find((item) => item.id === exception.control);
  if (!control) {
    return { valid: false, reason: "Exception references an unknown control." };
  }
  if (context.nonExceptionableControls?.includes(control.id)) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: `Control ${control.id} is non-exceptionable (EXC-021 section 7); an exception cannot waive it.`
    };
  }
  if (exception.project_id !== pack.project.id || exception.change_id !== pack.change.id) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Exception is outside the current project/change scope."
    };
  }
  if (!exception.reason?.trim() || !exception.requested_by?.trim() || !exception.requested_at || !exception.approved_by?.trim() || !exception.approved_at || !exception.expires_at) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Exception is missing required request or approval metadata."
    };
  }
  if (!context.evaluatedAt) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Evaluation timestamp is unavailable; exception validity cannot be verified."
    };
  }
  const requestedAt = Date.parse(exception.requested_at);
  const approvedAt = Date.parse(exception.approved_at);
  const expiresAt = Date.parse(exception.expires_at);
  const evaluatedAt = Date.parse(context.evaluatedAt);
  if ([requestedAt, approvedAt, expiresAt, evaluatedAt].some((value) => Number.isNaN(value)) || requestedAt > approvedAt || approvedAt > evaluatedAt || approvedAt >= expiresAt || expiresAt <= evaluatedAt) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "Exception has an invalid, future, or expired approval time window."
    };
  }
  if (exception.requested_by.trim().toLowerCase() === exception.approved_by.trim().toLowerCase()) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "The requester cannot approve their own exception (EXC-021 section 15)."
    };
  }
  if (control.severity === "P0") {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "P0 controls cannot be waived by an exception; they need the emergency governance process (EXC-021 section 8)."
    };
  }
  if (context.verifiedApprovals && !context.verifiedApprovals.includes(exception.id)) {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "The approval has no verified signature from the approver's registered key, so the approver is not authenticated."
    };
  }
  const authority = context.approverAuthority;
  if (authority && authority.length > 0) {
    const check = checkApproverAuthority(exception.approved_by, exception.approver_role, control.severity, authority);
    if (!check.authorized) {
      return {
        valid: false,
        controlSeverity: control.severity,
        reason: `Approver authority is not established: ${check.reason} (EXC-021 section 15).`
      };
    }
    return {
      valid: true,
      role: exception.approver_role,
      controlSeverity: control.severity,
      reason: `Approved exception is active and in scope; ${check.reason}.`
    };
  }
  if (control.severity === "P1") {
    return {
      valid: false,
      controlSeverity: control.severity,
      reason: "P1 controls cannot be waived by an exception without an approved approver-authority policy (EXC-021 sections 8 and 15)."
    };
  }
  return {
    valid: true,
    controlSeverity: control.severity,
    reason: "Approved exception is active and in scope."
  };
}
function deriveDecision(pack, evaluations, context = { signals: [] }) {
  const exceptionAssessments = /* @__PURE__ */ new Map();
  const applicableExceptions = /* @__PURE__ */ new Map();
  for (const exception of pack.exceptions ?? []) {
    if (exception.status !== "APPROVED") continue;
    const assessment = assessApprovedException(exception, pack, context);
    exceptionAssessments.set(exception.id, assessment);
    if (assessment.valid && exception.control) {
      applicableExceptions.set(exception.control, exception);
    }
  }
  const violations = evaluations.filter(
    (item) => item.applicable && item.status !== "PASS" && item.status !== "NOT_APPLICABLE"
  ).map((item) => {
    const violation = toViolation(item, pack);
    const exception = applicableExceptions.get(item.controlId);
    if (!exception) return violation;
    return {
      ...violation,
      decision: "GO_WITH_CONDITIONS",
      message: `${violation.message} An approved exception (${exception.id}) is active until ${exception.expires_at}; the control remains unverified or failed.`
    };
  });
  const isLowSeverity = (severity) => severity === "P1" || severity === "P2" || severity === "P3";
  const blockingControlViolations = violations.filter(
    (item) => !isLowSeverity(item.severity) || !applicableExceptions.has(item.controlId) && (item.status === "UNVERIFIED" || item.status === "FAIL" || item.decision === "NO-GO")
  );
  const controlWarnings = violations.filter(
    (item) => !blockingControlViolations.includes(item)
  );
  const isLowRisk = (risk) => risk.severity === "P2" || risk.severity === "P3";
  const openRisks = pack.risks.filter(
    (risk) => risk.status !== "MITIGATED" && risk.status !== "CLOSED" && !riskAcceptanceHolds(risk, context)
  ).map((risk) => risk.status === "ACCEPTED" ? { ...risk, status: "OPEN" } : risk).sort((a, b) => (severityRank3[a.severity] ?? 0) - (severityRank3[b.severity] ?? 0) || a.id.localeCompare(b.id));
  const riskViolations = openRisks.map((risk) => ({
    controlId: `RISK:${risk.id}`,
    status: isLowRisk(risk) ? "WARN" : "FAIL",
    severity: risk.severity,
    decision: isLowRisk(risk) ? "GO_WITH_CONDITIONS" : "NO-GO",
    message: pack.risks.some((sourceRisk) => sourceRisk.id === risk.id && sourceRisk.status === "ACCEPTED") ? `Risk ${risk.id} is ACCEPTED, but the acceptance does not hold (invalid, expired, or the approver's authority is not established) and it is treated as open.` : risk.title,
    missingEvidence: [],
    missingSignals: []
  }));
  const blockingRiskViolations = riskViolations.filter((item) => item.decision === "NO-GO");
  const acceptedP1Warnings = pack.risks.filter((risk) => risk.severity === "P1" && riskAcceptanceHolds(risk, context)).map((risk) => ({
    controlId: `RISK:${risk.id}`,
    status: "WARN",
    severity: risk.severity,
    decision: "GO_WITH_CONDITIONS",
    message: `Risk ${risk.id} is accepted under authority role ${risk.acceptance_role} until ${risk.acceptance_expires_at}; residual P1 risk remains. The approver's identity is declared in the governance pack, not authenticated.`,
    missingEvidence: [],
    missingSignals: []
  }));
  const riskWarnings = [...riskViolations.filter((item) => item.decision !== "NO-GO"), ...acceptedP1Warnings];
  const exceptionWarnings = [];
  for (const exception of pack.exceptions ?? []) {
    if (exception.status === "REQUESTED") {
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
        status: "WARN",
        severity: "P2",
        decision: "GO_WITH_CONDITIONS",
        message: `Exception ${exception.id} is requested but not approved; it does not waive the control.`,
        missingEvidence: [],
        missingSignals: []
      });
    } else if (exception.status === "EXPIRED") {
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
        status: "WARN",
        severity: "P1",
        decision: "GO_WITH_CONDITIONS",
        message: `Exception ${exception.id} is expired and cannot waive a control.`,
        missingEvidence: [],
        missingSignals: []
      });
    } else if (exception.status === "APPROVED") {
      const assessment = exceptionAssessments.get(exception.id);
      const severity = assessment?.controlSeverity ?? "P1";
      exceptionWarnings.push({
        controlId: `EXCEPTION:${exception.id}`,
        status: "WARN",
        severity,
        decision: "GO_WITH_CONDITIONS",
        message: assessment?.valid ? `Exception ${exception.id} is active; residual risk remains and the exception expires at ${exception.expires_at}${expiryCountdown(exception.expires_at, context.evaluatedAt)}.${assessment.role ? ` Approved under authority role ${assessment.role}; ${context.verifiedApprovals ? "the approver's signature was verified" : "the approver's identity is declared in the governance pack, not authenticated"}.` : ""}` : `Exception ${exception.id} was not applied: ${assessment?.reason ?? "validity could not be established"}`,
        missingEvidence: [],
        missingSignals: []
      });
    }
  }
  const scopeViolations = evaluations.some((item) => item.applicable) ? [] : [{
    controlId: "SCOPE:NO_APPLICABLE_CONTROLS",
    status: "UNVERIFIED",
    severity: "P1",
    decision: "NO-GO",
    message: "No governance control applied to this change, so nothing was evaluated.",
    missingEvidence: [],
    missingSignals: []
  }];
  const blockingViolations = [...blockingControlViolations, ...blockingRiskViolations, ...scopeViolations].sort((a, b) => (severityRank3[a.severity] ?? 0) - (severityRank3[b.severity] ?? 0) || a.controlId.localeCompare(b.controlId));
  const warnings = [...controlWarnings, ...riskWarnings, ...exceptionWarnings].sort((a, b) => (severityRank3[a.severity] ?? 0) - (severityRank3[b.severity] ?? 0) || a.controlId.localeCompare(b.controlId));
  if (blockingViolations.length > 0) {
    return {
      status: "NO-GO",
      reason: blockingControlViolations.length > 0 ? `Production blocked by ${blockingControlViolations.length} blocking control violation(s) and ${blockingRiskViolations.length} blocking risk(s).` : blockingRiskViolations.length > 0 ? `Production blocked by ${blockingRiskViolations.length} open or unaccepted P0/P1 risk(s).` : "Production blocked: no applicable control was evaluated, so the change is unassessed.",
      blockingViolations,
      warnings,
      openRisks
    };
  }
  if (warnings.length > 0) {
    return {
      status: "GO_WITH_CONDITIONS",
      reason: `${warnings.length} control, risk, or exception item(s) require review or conditional approval.`,
      blockingViolations: [],
      warnings,
      openRisks
    };
  }
  return {
    status: "GO",
    reason: "All applicable controls are satisfied and no open risks remain.",
    blockingViolations: [],
    warnings: [],
    openRisks
  };
}
function evaluateGovernance(pack, context) {
  const semanticIssues = validateGovernancePackSemantics(pack, context.evaluatedAt);
  if (semanticIssues.length > 0) {
    const details = semanticIssues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");
    throw new Error(`Governance pack semantic validation failed: ${details}`);
  }
  const controls = pack.controls.map(
    (control) => evaluateControl(control, pack.evidence, context)
  );
  const decision = deriveDecision(pack, controls, context);
  if (context.analysisStatus && context.analysisStatus !== "COMPLETE") {
    const failed = context.analysisStatus === "FAILED";
    const analysisViolation = {
      controlId: "ANALYSIS:COMPLETENESS",
      status: failed ? "FAIL" : "UNVERIFIED",
      severity: failed ? "P0" : "P1",
      decision: failed ? "NO-GO" : "GO_WITH_CONDITIONS",
      message: failed ? "Repository analysis failed; a production decision cannot be supported." : "Repository analysis is partial; unsupported or skipped checks require explicit review.",
      missingEvidence: [],
      missingSignals: context.unsupportedCapabilities ?? []
    };
    if (failed) {
      decision.status = "NO-GO";
      decision.blockingViolations.push(analysisViolation);
    } else {
      if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
      decision.warnings.push(analysisViolation);
    }
    decision.reason = `${decision.reason} Analysis status: ${context.analysisStatus}.`;
  }
  if (context.changeScopeStatus === "UNVERIFIED") {
    const scopeViolation = {
      controlId: "CHANGE-SCOPE:VERIFICATION",
      status: "UNVERIFIED",
      severity: "P1",
      decision: "GO_WITH_CONDITIONS",
      message: context.changeScopeReason ? `Changed-file scope could not be verified: ${context.changeScopeReason}` : "Changed-file scope was requested but could not be verified.",
      missingEvidence: [],
      missingSignals: []
    };
    if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
    decision.warnings.push(scopeViolation);
    decision.reason = `${decision.reason} Changed-file scope is unverified.`;
  }
  const findingsById = /* @__PURE__ */ new Map();
  for (const finding of [...pack.findings ?? [], ...context.findings ?? []]) {
    if (finding.status !== "RESOLVED") findingsById.set(finding.id, finding);
  }
  for (const finding of findingsById.values()) {
    const blocking = finding.severity === "P0" || finding.severity === "P1";
    const violation = {
      controlId: `FINDING:${finding.id}`,
      status: blocking ? "FAIL" : "WARN",
      severity: finding.severity,
      decision: blocking ? "NO-GO" : "GO_WITH_CONDITIONS",
      message: `[${finding.rule_id}] ${finding.message}`,
      missingEvidence: [],
      missingSignals: [],
      evidenceRefs: finding.evidence_refs
    };
    if (blocking) {
      decision.status = "NO-GO";
      decision.blockingViolations.push(violation);
    } else {
      if (decision.status === "GO") decision.status = "GO_WITH_CONDITIONS";
      decision.warnings.push(violation);
    }
  }
  if (findingsById.size > 0) {
    decision.reason = `${decision.reason} ${findingsById.size} unresolved finding(s) require remediation or governed acceptance.`;
  }
  return {
    controls,
    violations: [...decision.blockingViolations, ...decision.warnings],
    decision
  };
}

// src/authority.ts
function effectiveApproverAuthority(policy) {
  return policy.roles.filter((role) => role.status === "APPROVED").map((role) => ({
    role: role.id,
    severities: [...role.severities],
    holders: role.holders.filter((holder) => holder.name !== "UNASSIGNED").flatMap((holder) => [holder.name, ...holder.handle ? [holder.handle] : []])
  })).filter((role) => role.holders.length > 0);
}
function authoritySummary(policy) {
  return {
    id: policy.policy_id,
    version: policy.policy_version,
    roles: policy.roles.length,
    approved: effectiveApproverAuthority(policy).length
  };
}

// src/catalog.ts
var severityStrength = { P0: 0, P1: 1, P2: 2, P3: 3 };
var decisionStrength = { "NO-GO": 0, GO_WITH_CONDITIONS: 1, REVIEW_REQUIRED: 2, NONE: 3 };
function nonExceptionableCatalogControls(catalog) {
  return catalog.controls.filter((control) => control.exception_policy === "NON_EXCEPTIONABLE" && (control.status === "DRAFT" || control.status === "APPROVED")).map((control) => control.id).sort();
}
var preview = (ids) => ids.length <= 6 ? ids.join(", ") : `${ids.slice(0, 6).join(", ")} and ${ids.length - 6} more`;
function assessPackAgainstCatalog(pack, catalog) {
  const blocking = [];
  const draftMissing = [];
  const draftWeakened = [];
  const packControls = new Map(pack.controls.map((control) => [control.id, control]));
  for (const entry of catalog.controls) {
    if (!entry.mandatory || entry.status !== "APPROVED" && entry.status !== "DRAFT") continue;
    const enforced = entry.status === "APPROVED";
    const packControl = packControls.get(entry.id);
    if (!packControl) {
      if (enforced) {
        blocking.push({
          controlId: `CATALOG:${entry.id}:NOT-DEFINED`,
          status: "FAIL",
          severity: entry.severity,
          decision: "NO-GO",
          message: `Catalog control ${entry.id} (${entry.standard_id}, ${entry.source_section}: ${entry.source_text}) is APPROVED and mandatory, but the governance pack does not define it.`,
          missingEvidence: [],
          missingSignals: []
        });
      } else {
        draftMissing.push(entry.id);
      }
      continue;
    }
    const weakened = [];
    if (severityStrength[packControl.severity] > severityStrength[entry.severity]) {
      weakened.push(`severity ${packControl.severity} is below the catalog's ${entry.severity}`);
    }
    const packDecision = decisionStrength[packControl.failure_decision ?? "NONE"];
    if (packDecision > decisionStrength[entry.failure_decision]) {
      weakened.push(`failure decision ${packControl.failure_decision ?? "NONE"} is softer than the catalog's ${entry.failure_decision}`);
    }
    if (packControl.standard !== entry.standard_id) {
      weakened.push(`it cites standard ${packControl.standard} instead of ${entry.standard_id}`);
    }
    if (weakened.length === 0) continue;
    if (enforced) {
      blocking.push({
        controlId: `CATALOG:${entry.id}:WEAKENED`,
        status: "FAIL",
        severity: entry.severity,
        decision: "NO-GO",
        message: `The governance pack weakens APPROVED catalog control ${entry.id}: ${weakened.join("; ")}.`,
        missingEvidence: [],
        missingSignals: []
      });
    } else {
      draftWeakened.push(entry.id);
    }
  }
  const warnings = [];
  const draftCondition = (suffix, ids, what) => {
    if (ids.length === 0) return;
    warnings.push({
      controlId: `CATALOG:${catalog.catalog_id}:${suffix}`,
      status: "WARN",
      severity: "P2",
      decision: "GO_WITH_CONDITIONS",
      message: `${ids.length} mandatory DRAFT control(s) in catalog ${catalog.catalog_id} ${catalog.catalog_version} ${what}. DRAFT controls are not enforced until approved: ${preview(ids)}.`,
      missingEvidence: [],
      missingSignals: []
    });
  };
  draftCondition("DRAFT-CONTROLS-NOT-DEFINED", draftMissing, "are not defined in the governance pack");
  draftCondition("DRAFT-CONTROLS-WEAKENED", draftWeakened, "are weakened by the governance pack");
  return { blocking, warnings };
}

// src/output.ts
function analysisLines(analysis, context) {
  const lines = [
    "Repository analysis:",
    `  Status: ${context.analysisStatus ?? "UNVERIFIED"}`,
    `  Languages: ${analysis.facts.languages.join(", ") || "none detected"}`,
    `  Frameworks: ${analysis.facts.frameworks.join(", ") || "none detected"}`,
    `  Package managers: ${analysis.facts.packageManagers.join(", ") || "none detected"}`,
    `  Build systems: ${analysis.facts.buildSystems.join(", ") || "none detected"}`,
    `  Infrastructure: ${analysis.facts.infrastructureSystems.join(", ") || "none detected"}`,
    `  Test systems: ${analysis.facts.testSystems.join(", ") || "none detected"}`,
    `  Analyzer adapters: ${analysis.adapterResults.length}`
  ];
  const packages = analysis.facts.packages ?? [];
  lines.push(`  Packages/workspaces: ${packages.length}`);
  for (const projectPackage of packages) {
    lines.push(
      `    - ${projectPackage.root} | languages: ${projectPackage.languages.join(", ") || "none"} | frameworks: ${projectPackage.frameworks.join(", ") || "none"} | package managers: ${projectPackage.packageManagers.join(", ") || "none"}`
    );
  }
  if (analysis.systemGraph) {
    const countNodes = (type) => analysis.systemGraph.nodes.filter((node) => node.type === type).length;
    const countEdges = (type) => analysis.systemGraph.edges.filter((edge) => edge.type === type).length;
    lines.push(
      "",
      `System relationship graph: ${analysis.systemGraph.status}`,
      `  Packages: ${countNodes("PACKAGE")}`,
      `  Services: ${countNodes("SERVICE")}`,
      `  API endpoints: ${countNodes("API_ENDPOINT")}`,
      `  Databases: ${countNodes("DATABASE")}`,
      `  Events: ${countNodes("EVENT")}`,
      `  Relationships: ${analysis.systemGraph.edges.length}`,
      `    Exposes API: ${countEdges("EXPOSES_API")}`,
      `    Uses database: ${countEdges("USES_DATABASE")}`,
      `    Publishes events: ${countEdges("PUBLISHES_EVENT")}`,
      `    Subscribes to events: ${countEdges("SUBSCRIBES_EVENT")}`
    );
    for (const limitation of analysis.systemGraph.limitations) {
      lines.push(`  System-graph limitation: ${limitation}`);
    }
  }
  if (analysis.snapshotFingerprint) {
    lines.push(
      "",
      `Snapshot fingerprint: ${analysis.snapshotFingerprint.digest}`,
      `  Files inventoried: ${analysis.snapshotFingerprint.fileCount}`,
      `  Source content coverage: ${analysis.snapshotFingerprint.inspectedSourceFileCount}/${analysis.snapshotFingerprint.sourceFileCount} (${analysis.snapshotFingerprint.sourceContentStatus})`
    );
    for (const limitation of analysis.snapshotFingerprint.limitations) {
      lines.push(`  Fingerprint limitation: ${limitation}`);
    }
  }
  if (analysis.changeScope) {
    lines.push(
      "",
      `Changed-file scope: ${analysis.changeScope.status}`,
      `  Base revision: ${analysis.changeScope.baseRef}`,
      `  Changed files: ${analysis.changeScope.files.length}`
    );
    if (analysis.changeScope.headRef) lines.push(`  Head revision: ${analysis.changeScope.headRef}`);
    if (analysis.changeScope.reason) lines.push(`  Scope limitation: ${analysis.changeScope.reason}`);
  } else {
    lines.push("", "Changed-file scope: NOT REQUESTED", "  Pass --base <git-ref> to verify the declared change scope.");
  }
  const incompleteAdapters = analysis.adapterResults.filter((item) => item.executionStatus !== "SUCCESS");
  if (incompleteAdapters.length > 0) {
    lines.push("", "Analyzer limitations:");
    for (const adapter of incompleteAdapters) {
      lines.push(`  - ${adapter.adapterId}: ${adapter.executionStatus}`);
      for (const limitation of adapter.limitations) lines.push(`    ${limitation}`);
      for (const capability of adapter.unsupportedCapabilities) lines.push(`    Unsupported: ${capability}`);
    }
  }
  if (analysis.verification) {
    lines.push("", `Tool verification: ${analysis.verification.status}`);
    const counts = resultCounts(analysis.verification.results);
    if (counts) lines.push(`  Results: ${counts}`);
    for (const result of analysis.verification.results) {
      lines.push(`  [${result.status}] ${result.tool}${result.toolVersion ? ` (${result.toolVersion})` : ""}: ${result.summary}`);
      for (const limitation of result.limitations) lines.push(`    Limitation: ${limitation}`);
    }
  }
  if (analysis.architecture) {
    lines.push(
      "",
      `Architecture profile: ${analysis.architecture.profileId} (${analysis.architecture.status})`,
      `  File dependency edges: ${analysis.architecture.graph.edges.length}`,
      `  Mapped components: ${analysis.architecture.graph.components.length}`,
      `  Component dependency edges: ${analysis.architecture.graph.componentEdges.length}`,
      `  Cross-package dependency edges: ${analysis.architecture.graph.packageEdges.length}`,
      `  Boundary findings: ${analysis.architecture.findings.length}`
    );
    const impact = analysis.architecture.graph.changeImpact;
    lines.push(
      `  Change impact: ${impact.status}`,
      `  Changed source files: ${impact.changedFiles.length}`,
      `  Changed components: ${impact.changedComponents.join(", ") || "none mapped"}`,
      `  Impacted files (including changed files): ${impact.impactedFiles.length}`,
      `  Impacted components: ${impact.impactedComponents.join(", ") || "none mapped"}`
    );
    for (const limitation of impact.limitations) lines.push(`  Change-impact limitation: ${limitation}`);
    for (const finding of analysis.architecture.findings) {
      const location = finding.source_location ? ` ${finding.source_location.file}:${finding.source_location.start_line ?? 1}` : "";
      lines.push(`  [${finding.severity}] ${finding.rule_id}${location}: ${finding.message}`);
    }
  }
  if (context.unsupportedCapabilities?.length) {
    lines.push("", `Unsupported capabilities: ${context.unsupportedCapabilities.join(", ")}`);
  }
  return lines;
}
function formatAnalysisResult(analysis, context, json = false) {
  if (json) return JSON.stringify({ analysis, context }, null, 2);
  return analysisLines(analysis, context).join("\n");
}
var projectLine = (project) => `${project.id} (${project.status}, criticality ${project.criticality}, data ${project.data_classification})`;
var catalogLine = (catalog) => `${catalog.id} ${catalog.version} (${catalog.controls} controls)`;
var authorityLine = (authority) => `${authority.id} ${authority.version} (${authority.approved} of ${authority.roles} roles approved${authority.approved === 0 ? "; none enforced" : ""})`;
function formatHumanResult(analysis, evaluation, context, scope) {
  const lines = [
    `Decision: ${evaluation.decision.status}`,
    ...scope?.project ? [`Project: ${projectLine(scope.project)}`] : [],
    ...scope?.catalog ? [`Catalog: ${catalogLine(scope.catalog)}`] : [],
    ...scope?.authority ? [`Authority: ${authorityLine(scope.authority)}`] : [],
    "",
    ...analysisLines(analysis, context),
    "",
    `Controls evaluated: ${evaluation.controls.length}`,
    `Blocking violations: ${evaluation.decision.blockingViolations.length}`,
    `Warnings: ${evaluation.decision.warnings.length}`,
    `Open risks: ${evaluation.decision.openRisks.length}`
  ];
  if (evaluation.decision.reason) lines.push("", `Reason: ${evaluation.decision.reason}`);
  const decisionItems = [...evaluation.decision.blockingViolations, ...evaluation.decision.warnings];
  if (decisionItems.length > 0) lines.push("", "Decision findings:");
  for (const item of decisionItems) {
    lines.push(`  [${item.severity}] ${item.controlId}: ${item.message}`);
    if (item.missingEvidence.length > 0) lines.push(`    Missing evidence: ${item.missingEvidence.join(", ")}`);
    if (item.missingSignals.length > 0) lines.push(`    Missing signals/capabilities: ${item.missingSignals.join(", ")}`);
    if (item.evidenceRefs?.length) lines.push(`    Evidence: ${item.evidenceRefs.join(", ")}`);
  }
  for (const control of evaluation.controls) {
    if (control.status === "PASS" || control.status === "NOT_APPLICABLE") continue;
    lines.push("", `[${control.status}] ${control.controlId}: ${control.reason}`);
  }
  return lines.join("\n");
}
function resultCounts(results) {
  return TOOL_RESULT_STATUSES.map((status) => ({ status, count: results.filter((result) => result.status === status).length })).filter((entry) => entry.count > 0).map((entry) => `${entry.count} ${entry.status}`).join(", ");
}
var cell = (value) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
function formatMarkdownResult(analysis, evaluation, context, scope) {
  const { decision } = evaluation;
  const list = (items) => items.length ? items.join(", ") : "none detected";
  const lines = [
    "# Governance report",
    "",
    `**Decision:** ${decision.status}`,
    ...scope?.project ? ["", `**Project:** ${projectLine(scope.project)}`] : [],
    ...scope?.catalog ? ["", `**Catalog:** ${catalogLine(scope.catalog)}`] : [],
    ...scope?.authority ? ["", `**Authority:** ${authorityLine(scope.authority)}`] : [],
    ...decision.reason ? ["", `**Reason:** ${decision.reason}`] : [],
    "",
    "## Repository analysis",
    "",
    "| | |",
    "|---|---|",
    `| Analysis status | ${context.analysisStatus ?? "UNVERIFIED"} |`,
    `| Languages | ${cell(list(analysis.facts.languages))} |`,
    `| Frameworks | ${cell(list(analysis.facts.frameworks))} |`,
    `| Package managers | ${cell(list(analysis.facts.packageManagers))} |`,
    `| Build systems | ${cell(list(analysis.facts.buildSystems))} |`,
    `| Infrastructure | ${cell(list(analysis.facts.infrastructureSystems))} |`,
    `| Test systems | ${cell(list(analysis.facts.testSystems))} |`,
    "",
    "## Decision summary",
    "",
    `- Controls evaluated: ${evaluation.controls.length}`,
    `- Blocking violations: ${decision.blockingViolations.length}`,
    `- Warnings: ${decision.warnings.length}`,
    `- Open risks: ${decision.openRisks.length}`
  ];
  const section = (title, items) => {
    if (items.length === 0) return;
    lines.push("", `## ${title}`, "");
    for (const item of items) {
      lines.push(`- **[${item.severity}] ${item.controlId}**: ${item.message}`);
      if (item.missingEvidence.length > 0) lines.push(`  - Missing evidence: ${item.missingEvidence.join(", ")}`);
      if (item.missingSignals.length > 0) lines.push(`  - Missing signals/capabilities: ${item.missingSignals.join(", ")}`);
      if (item.evidenceRefs?.length) lines.push(`  - Evidence: ${item.evidenceRefs.join(", ")}`);
    }
  };
  if (analysis.verification && analysis.verification.results.length > 0) {
    lines.push(
      "",
      "## Tool verification",
      "",
      `Overall: ${analysis.verification.status}. Results: ${resultCounts(analysis.verification.results)}.`,
      "",
      "| Tool | Result | Summary |",
      "|---|---|---|"
    );
    for (const result of analysis.verification.results) lines.push(`| ${cell(result.tool)} | ${result.status} | ${cell(result.summary)} |`);
  }
  section("Blocking violations", decision.blockingViolations);
  section("Warnings", decision.warnings);
  const attention = evaluation.controls.filter((c) => c.status !== "PASS" && c.status !== "NOT_APPLICABLE");
  if (attention.length > 0) {
    lines.push("", "## Controls needing attention", "", "| Control | Status | Reason |", "|---|---|---|");
    for (const control of attention) lines.push(`| ${cell(control.controlId)} | ${control.status} | ${cell(control.reason)} |`);
  }
  return lines.join("\n");
}
function formatJsonResult(analysis, evaluation, context, scope) {
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const fingerprint = analysis.snapshotFingerprint?.digest ?? null;
  const timestampKey = generatedAt.replace(/\D/g, "").slice(0, 17);
  const fingerprintKey = fingerprint?.replace(/^sha256:/, "").slice(0, 12).toUpperCase() ?? "NO-FINGERPRINT";
  const assessmentId = `ASM-${timestampKey}-${fingerprintKey}`;
  return JSON.stringify({
    report: {
      schemaVersion: "1.0.0",
      assessmentId,
      generatedAt,
      repositoryFingerprint: fingerprint,
      changeScope: analysis.changeScope ?? null,
      decision: evaluation.decision.status,
      ...scope?.project ? { project: scope.project } : {},
      ...scope?.catalog ? { catalog: scope.catalog } : {},
      ...scope?.authority ? { authority: scope.authority } : {}
    },
    analysis,
    context,
    evaluation
  }, null, 2);
}

// src/commands.ts
async function runGovernanceCommand(input) {
  const analysis = await analyzeRepository(input.snapshot, void 0, input.architectureProfile);
  if (input.verificationRunner) {
    const verification = await runVerificationAdapters(input.snapshot, input.verificationRunner);
    analysis.verification = verification;
    analysis.evidence.push(...verification.evidence);
    analysis.findings.push(...verification.findings);
    analysis.adapterResults.push(...verification.adapterResults);
  }
  const packEvidenceIds = new Set(input.governancePack.evidence.map((item) => item.id));
  const collidingEvidence = analysis.evidence.filter((item) => packEvidenceIds.has(item.id));
  if (collidingEvidence.length > 0) {
    analysis.findings.push(...collidingEvidence.map((item) => ({
      id: `FND-EVIDENCE-COLLISION-${item.id}`,
      rule_id: "EVIDENCE-ID-COLLISION",
      severity: "P1",
      category: "evidence-integrity",
      message: `Generated evidence ID '${item.id}' conflicts with evidence declared in the governance pack; neither record was silently substituted.`,
      status: "OPEN",
      evidence_refs: [item.id],
      confidence: 1,
      remediation: "Use distinct, namespaced evidence IDs and rerun the assessment."
    })));
  }
  const context = toGovernanceContext(analysis);
  if (input.authorityPolicy) {
    const approverAuthority = effectiveApproverAuthority(input.authorityPolicy);
    if (approverAuthority.length > 0) context.approverAuthority = approverAuthority;
  }
  if (input.verifiedApprovals) context.verifiedApprovals = input.verifiedApprovals;
  if (input.controlCatalog) {
    const nonExceptionable = nonExceptionableCatalogControls(input.controlCatalog);
    if (nonExceptionable.length > 0) context.nonExceptionableControls = nonExceptionable;
  }
  const assessmentPack = {
    ...input.governancePack,
    evidence: [
      ...input.governancePack.evidence,
      ...analysis.evidence.filter((item) => !packEvidenceIds.has(item.id))
    ]
  };
  const evaluation = evaluateGovernance(assessmentPack, context);
  if (!context.changeScopeStatus) {
    const scopeWarning = {
      controlId: "CHANGE-SCOPE:NOT-REQUESTED",
      status: "UNVERIFIED",
      severity: "P1",
      decision: "GO_WITH_CONDITIONS",
      message: "Git changed-file scope was not requested. Pass --base <git-ref> before treating this as a complete change review.",
      missingEvidence: [],
      missingSignals: []
    };
    if (evaluation.decision.status === "GO") evaluation.decision.status = "GO_WITH_CONDITIONS";
    evaluation.decision.warnings.push(scopeWarning);
    evaluation.decision.reason = `${evaluation.decision.reason} Git changed-file scope was not requested.`;
    evaluation.violations.push(scopeWarning);
  }
  if (context.changeScopeStatus === "VERIFIED") {
    const normalizeChangedPath = (file) => file.replaceAll("\\", "/").replace(/^\.\//, "");
    const actualFiles = new Set((context.changedFiles ?? []).map(normalizeChangedPath));
    const declaredFiles = new Set(input.governancePack.change.files.map(normalizeChangedPath));
    const undeclaredFiles = [...actualFiles].filter((file) => !declaredFiles.has(file)).sort();
    const staleDeclarations = [...declaredFiles].filter((file) => !actualFiles.has(file)).sort();
    if (undeclaredFiles.length > 0 || staleDeclarations.length > 0) {
      const details = [
        ...undeclaredFiles.length ? [`undeclared changed files: ${undeclaredFiles.join(", ")}`] : [],
        ...staleDeclarations.length ? [`declared but unchanged files: ${staleDeclarations.join(", ")}`] : []
      ].join("; ");
      const scopeViolation = {
        controlId: "CHANGE-SCOPE:DECLARATION-MISMATCH",
        status: "FAIL",
        severity: "P1",
        decision: "NO-GO",
        message: `The governance change manifest does not match the verified Git diff (${details}).`,
        missingEvidence: [],
        missingSignals: []
      };
      evaluation.decision.status = "NO-GO";
      evaluation.decision.blockingViolations.push(scopeViolation);
      evaluation.decision.reason = `${evaluation.decision.reason} Declared change scope does not match the verified diff.`;
      evaluation.violations.push(scopeViolation);
    }
  }
  const missingRequiredControls = (input.architectureProfile?.requiredControls ?? []).filter((controlId) => !input.governancePack.controls.some((control) => control.id === controlId));
  const profileControlViolations = missingRequiredControls.map((controlId) => ({
    controlId: `PROFILE:${input.architectureProfile?.id}:REQUIRED-CONTROL:${controlId}`,
    status: "FAIL",
    severity: "P1",
    decision: "NO-GO",
    message: `Architecture profile '${input.architectureProfile?.id}' requires governance control '${controlId}', but the governance pack does not define it.`,
    missingEvidence: [],
    missingSignals: []
  }));
  if (profileControlViolations.length > 0) {
    evaluation.decision.status = "NO-GO";
    evaluation.decision.blockingViolations.push(...profileControlViolations);
    evaluation.decision.reason = `${evaluation.decision.reason} ${profileControlViolations.length} required architecture control(s) are missing from the governance pack.`;
    evaluation.violations.push(...profileControlViolations);
  }
  if (input.controlCatalog) {
    const assessed = assessPackAgainstCatalog(input.governancePack, input.controlCatalog);
    if (assessed.blocking.length > 0) {
      evaluation.decision.status = "NO-GO";
      evaluation.decision.blockingViolations.push(...assessed.blocking);
      evaluation.violations.push(...assessed.blocking);
      evaluation.decision.reason = `${evaluation.decision.reason} ${assessed.blocking.length} APPROVED catalog control(s) are missing from, or weakened by, the governance pack.`;
    }
    if (assessed.warnings.length > 0) {
      evaluation.decision.warnings.push(...assessed.warnings);
      evaluation.violations.push(...assessed.warnings);
      if (evaluation.decision.status === "GO") {
        evaluation.decision.status = "GO_WITH_CONDITIONS";
        evaluation.decision.reason = `${evaluation.decision.reason} Draft catalog controls are not satisfied (not enforced until approved).`;
      }
    }
  }
  const registration = input.registration;
  const gaps = registration ? [
    ["technical owner", registration.owners.technical_owner],
    ["governance representative", registration.owners.governance_representative]
  ].filter(([, contact]) => contact.name === "UNASSIGNED").map(([role]) => role) : [];
  if (registration && gaps.length > 0) {
    const ownershipGap = {
      controlId: `REGISTRY:${registration.id}:OWNERSHIP-GAP`,
      status: "WARN",
      severity: "P2",
      decision: "GO_WITH_CONDITIONS",
      message: `Project '${registration.id}' has no assigned ${gaps.join(" or ")} in the registry; ownership is an explicit gap, not a pass.`,
      missingEvidence: [],
      missingSignals: []
    };
    evaluation.decision.warnings.push(ownershipGap);
    evaluation.violations.push(ownershipGap);
    if (evaluation.decision.status === "GO") {
      evaluation.decision.status = "GO_WITH_CONDITIONS";
      evaluation.decision.reason = `${evaluation.decision.reason} Registry ownership gap: ${gaps.join(", ")} unassigned.`;
    }
  }
  const project = registration ? {
    id: registration.id,
    name: registration.name,
    status: registration.status,
    criticality: registration.criticality,
    data_classification: registration.data_classification
  } : void 0;
  const scope = {
    ...project ? { project } : {},
    ...input.authorityPolicy ? { authority: authoritySummary(input.authorityPolicy) } : {},
    ...input.controlCatalog ? {
      catalog: {
        id: input.controlCatalog.catalog_id,
        version: input.controlCatalog.catalog_version,
        controls: input.controlCatalog.controls.length
      }
    } : {}
  };
  const output = input.json ? formatJsonResult(analysis, evaluation, context, scope) : input.markdown ? formatMarkdownResult(analysis, evaluation, context, scope) : formatHumanResult(analysis, evaluation, context, scope);
  return { analysis, context, evaluation, output };
}
async function runAnalyzeCommand(input) {
  return (await runGovernanceCommand(input)).output;
}
async function runRepositoryAnalysisCommand(snapshot, json = false, architectureProfile, verificationRunner) {
  const analysis = await analyzeRepository(snapshot, void 0, architectureProfile);
  if (verificationRunner) {
    const verification = await runVerificationAdapters(snapshot, verificationRunner);
    analysis.verification = verification;
    analysis.evidence.push(...verification.evidence);
    analysis.findings.push(...verification.findings);
    analysis.adapterResults.push(...verification.adapterResults);
  }
  const context = toGovernanceContext(analysis);
  return {
    analysis,
    context,
    output: formatAnalysisResult(analysis, context, json)
  };
}

// src/filesystem.ts
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path4 from "node:path";
var manifestNames2 = /* @__PURE__ */ new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Makefile",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "poetry.lock",
  "uv.lock",
  "Pipfile.lock"
]);
var ignoredDirectories = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox"
]);
var MAX_FILES = 5e4;
var MAX_TEXT_FILE_BYTES = 1e6;
var MAX_SOURCE_FILES_FOR_ANALYSIS = 5e3;
var MAX_TOTAL_SOURCE_CONTENT_CHARS = 2e7;
var sourceExtensions4 = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".java",
  ".rs",
  ".cs",
  ".rb",
  ".php",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cc",
  ".cpp",
  ".hpp"
]);
function normalizedRelativePath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}
function resolveConfinedPath(rootPath, relativePath) {
  const root = path4.resolve(rootPath);
  const target = path4.resolve(root, relativePath);
  const relative = path4.relative(root, target);
  if (relative === ".." || relative.startsWith(`..${path4.sep}`) || path4.isAbsolute(relative)) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }
  return target;
}
function createNodeFileSystem(limits = {}) {
  const maxFiles = limits.maxFiles ?? MAX_FILES;
  const maxTextFileBytes = limits.maxTextFileBytes ?? MAX_TEXT_FILE_BYTES;
  if (!Number.isSafeInteger(maxFiles) || maxFiles <= 0) {
    throw new Error("maxFiles must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(maxTextFileBytes) || maxTextFileBytes <= 0) {
    throw new Error("maxTextFileBytes must be a positive safe integer.");
  }
  return {
    async listFiles(rootPath) {
      const root = await realpath(rootPath);
      const rootInfo = await lstat(root);
      if (!rootInfo.isDirectory()) throw new Error(`Repository root is not a directory: ${rootPath}`);
      const files = [];
      async function walk(directory, relativeDirectory) {
        const entries = await readdir(directory, { withFileTypes: true });
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
          if (entry.isSymbolicLink()) continue;
          const relativePath = relativeDirectory ? path4.posix.join(relativeDirectory, entry.name) : entry.name;
          if (entry.isDirectory()) {
            if (!ignoredDirectories.has(entry.name)) await walk(path4.join(directory, entry.name), relativePath);
            continue;
          }
          if (entry.isFile()) {
            files.push(relativePath);
            if (files.length > maxFiles) {
              throw new Error(`Repository scan exceeded the ${maxFiles.toLocaleString()} file limit.`);
            }
          }
        }
      }
      await walk(root, "");
      return files;
    },
    async readTextFile(rootPath, relativePath) {
      const root = await realpath(rootPath);
      const target = resolveConfinedPath(root, relativePath);
      let targetInfo;
      try {
        targetInfo = await lstat(target);
      } catch (error) {
        if (error.code === "ENOENT") return void 0;
        throw error;
      }
      if (!targetInfo.isFile() || targetInfo.isSymbolicLink()) return void 0;
      const canonicalTarget = await realpath(target);
      const relativeCanonicalTarget = path4.relative(root, canonicalTarget);
      if (relativeCanonicalTarget === ".." || relativeCanonicalTarget.startsWith(`..${path4.sep}`) || path4.isAbsolute(relativeCanonicalTarget)) {
        throw new Error(`Resolved file escapes repository root: ${relativePath}`);
      }
      if (targetInfo.size > maxTextFileBytes) {
        throw new Error(`Refusing to read ${relativePath}: file exceeds ${maxTextFileBytes} bytes.`);
      }
      const content = await readFile(target, "utf8");
      return content;
    }
  };
}
var nodeFileSystem = createNodeFileSystem();
async function loadRepositorySnapshot(rootPath, fs, changedFiles = [], changeScope) {
  const files = (await fs.listFiles(rootPath)).map(normalizedRelativePath).filter((file) => file.length > 0).sort();
  const manifestPaths = files.filter((file) => {
    const basename2 = path4.posix.basename(file);
    return manifestNames2.has(basename2);
  });
  const sourcePaths = files.filter((file) => sourceExtensions4.has(path4.posix.extname(file).toLowerCase()));
  const sourcePathSet = new Set(sourcePaths);
  const manifestPathSet = new Set(manifestPaths);
  const contentPaths = [.../* @__PURE__ */ new Set([...manifestPaths, ...sourcePaths])];
  const fileContents = {};
  const contentLimitations = [];
  let sourceFilesLoaded = 0;
  let totalSourceContentChars = 0;
  for (const relativePath of contentPaths) {
    const isSource = sourcePathSet.has(relativePath);
    if (isSource && (sourceFilesLoaded >= MAX_SOURCE_FILES_FOR_ANALYSIS || totalSourceContentChars >= MAX_TOTAL_SOURCE_CONTENT_CHARS)) {
      contentLimitations.push(
        `Source-content limits reached; ${relativePath} and later source files were not inspected.`
      );
      break;
    }
    let content;
    try {
      content = await fs.readTextFile(rootPath, relativePath);
    } catch (error) {
      contentLimitations.push(
        `Unable to read content for ${relativePath}; dependent analysis may be incomplete (${error instanceof Error ? error.message : String(error)}).`
      );
      continue;
    }
    if (content === void 0) {
      if (isSource || manifestPathSet.has(relativePath)) {
        contentLimitations.push(
          `Content unavailable for ${relativePath}; dependent analysis may be incomplete.`
        );
      }
      continue;
    }
    if (isSource && totalSourceContentChars + content.length > MAX_TOTAL_SOURCE_CONTENT_CHARS) {
      contentLimitations.push(
        `Source-content character limit reached before ${relativePath}; this and later source files were not inspected.`
      );
      break;
    }
    fileContents[relativePath] = content;
    if (isSource) {
      sourceFilesLoaded += 1;
      totalSourceContentChars += content.length;
    }
  }
  return {
    rootPath: path4.resolve(rootPath),
    files,
    changedFiles: (changeScope?.files ?? [...changedFiles]).map(normalizedRelativePath),
    fileContents,
    ...contentLimitations.length > 0 ? { contentLimitations } : {},
    ...changeScope ? { changeScope } : {}
  };
}

// src/verification-runner.ts
import { execFile } from "node:child_process";
import { access, realpath as realpath2 } from "node:fs/promises";
import path5 from "node:path";
var EXECUTION_BUFFER_BYTES = 2e6;
var ALLOWLISTED_TOOLS = /* @__PURE__ */ new Set([
  "typescript",
  "python3",
  "python",
  "osv-scanner",
  "gitleaks",
  "semgrep"
]);
function assertAllowlistedTool(tool) {
  if (!ALLOWLISTED_TOOLS.has(tool)) {
    throw new Error(`Verification tool is not allowlisted: ${tool}`);
  }
}
async function resolveConfinedWorkingDirectory(rootPath, workingDirectory) {
  const root = await realpath2(rootPath);
  const candidate = path5.resolve(root, workingDirectory);
  const lexicalRelative = path5.relative(root, candidate);
  if (lexicalRelative === ".." || lexicalRelative.startsWith(`..${path5.sep}`) || path5.isAbsolute(lexicalRelative)) {
    throw new Error(`Verification working directory escapes repository root: ${workingDirectory}`);
  }
  const canonicalCandidate = await realpath2(candidate);
  const canonicalRelative = path5.relative(root, canonicalCandidate);
  if (canonicalRelative === ".." || canonicalRelative.startsWith(`..${path5.sep}`) || path5.isAbsolute(canonicalRelative)) {
    throw new Error(`Verification working directory resolves outside repository root: ${workingDirectory}`);
  }
  return canonicalCandidate;
}
function runExecutable(executable, args, cwd, timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    execFile(
      executable,
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: EXECUTION_BUFFER_BYTES,
        windowsHide: true,
        encoding: "utf8",
        env: {
          PATH: process.env.PATH ?? "",
          SystemRoot: process.env.SystemRoot ?? "",
          TEMP: process.env.TEMP ?? "",
          TMP: process.env.TMP ?? "",
          HOME: process.env.HOME ?? "",
          PYTHONNOUSERSITE: "1",
          PYTHONDONTWRITEBYTECODE: "1"
        }
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startedAt;
        if (!error) {
          resolve({ exitCode: 0, stdout, stderr, durationMs });
          return;
        }
        const exitCode = typeof error.code === "number" ? error.code : void 0;
        if (exitCode !== void 0) {
          resolve({ exitCode, stdout, stderr, durationMs });
          return;
        }
        reject(error);
      }
    );
  });
}
async function findTypeScriptCompiler(rootPath, workingDirectory) {
  const root = await realpath2(rootPath);
  let directory = await resolveConfinedWorkingDirectory(root, workingDirectory);
  while (directory === root || directory.startsWith(`${root}${path5.sep}`)) {
    const candidate = path5.join(directory, "node_modules", "typescript", "bin", "tsc");
    try {
      await access(candidate);
      return candidate;
    } catch {
      if (directory === root) break;
      directory = path5.dirname(directory);
    }
  }
  return void 0;
}
function firstLine(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).find((line) => line !== "");
}
var nodeVerificationToolRunner = {
  async isAvailable(tool, rootPath, workingDirectory) {
    assertAllowlistedTool(tool);
    if (tool === "typescript") {
      return Boolean(await findTypeScriptCompiler(rootPath, workingDirectory));
    }
    try {
      const cwd = await resolveConfinedWorkingDirectory(rootPath, workingDirectory);
      const result = await runExecutable(tool, ["--version"], cwd, 5e3);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  },
  async getVersion(tool, rootPath, workingDirectory) {
    assertAllowlistedTool(tool);
    try {
      if (tool === "typescript") {
        const compiler = await findTypeScriptCompiler(rootPath, workingDirectory);
        if (!compiler) return void 0;
        const result2 = await runExecutable(
          process.execPath,
          [compiler, "--version"],
          await resolveConfinedWorkingDirectory(rootPath, workingDirectory),
          5e3
        );
        return result2.exitCode === 0 ? firstLine(result2.stdout) : void 0;
      }
      const result = await runExecutable(
        tool,
        ["--version"],
        await resolveConfinedWorkingDirectory(rootPath, workingDirectory),
        5e3
      );
      return result.exitCode === 0 ? firstLine(result.stdout) : void 0;
    } catch {
      return void 0;
    }
  },
  async run(tool, args, rootPath, workingDirectory, timeoutMs) {
    assertAllowlistedTool(tool);
    const cwd = await resolveConfinedWorkingDirectory(rootPath, workingDirectory);
    if (tool === "typescript") {
      const compiler = await findTypeScriptCompiler(rootPath, workingDirectory);
      if (!compiler) throw new Error(`Local TypeScript compiler was not found for ${workingDirectory}.`);
      return runExecutable(
        process.execPath,
        [compiler, ...args],
        cwd,
        timeoutMs
      );
    }
    return runExecutable(tool, args, cwd, timeoutMs);
  }
};

// src/discover.ts
import { execFile as execFile2 } from "node:child_process";
import { lstat as lstat2, readdir as readdir2, readFile as readFile2, stat } from "node:fs/promises";
import path6 from "node:path";
import { promisify } from "node:util";
var run = promisify(execFile2);
var MAX_DEPTH = 3;
var MAX_TEXT_BYTES = 1e6;
var MAX_CI_COMMANDS = 200;
var GIT_TIMEOUT_MS = 1e4;
var SKIPPED_DIRECTORIES = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox"
]);
var KNOWN_DOCS = ["CLAUDE.md", "AGENTS.md", "README.md", "CONTRIBUTING.md", "SECURITY.md"];
var KNOWN_DIRECTORIES = ["docs", "contracts", "migrations", "tests", "test", "src", "scripts"];
var LOCKFILES = [
  ["pnpm-lock.yaml", "pnpm"],
  ["package-lock.json", "npm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["uv.lock", "uv"],
  ["poetry.lock", "poetry"],
  ["requirements.txt", "pip"]
];
async function exists(target) {
  try {
    await lstat2(target);
    return true;
  } catch {
    return false;
  }
}
async function readSmallText(file) {
  try {
    const info = await lstat2(file);
    if (!info.isFile() || info.size > MAX_TEXT_BYTES) return void 0;
    return await readFile2(file, "utf8");
  } catch {
    return void 0;
  }
}
function sanitizeRemote(remote) {
  return remote.trim().replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/\s]*@/i, "$1");
}
function repositorySlug(remote) {
  const match = /^(?:[a-z][a-z0-9+.-]*:\/\/(?:[^/]+)\/|[^@\s]+@[^:\s]+:)([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/i.exec(remote.trim());
  return match?.[1];
}
async function git(repository, args) {
  try {
    const { stdout } = await run("git", args, {
      cwd: repository,
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    });
    return stdout.trim();
  } catch {
    return void 0;
  }
}
async function gitFacts(repository) {
  const [branch, head, status, rawRemote] = await Promise.all([
    git(repository, ["branch", "--show-current"]),
    git(repository, ["rev-parse", "HEAD"]),
    git(repository, ["status", "--porcelain"]),
    git(repository, ["remote", "get-url", "origin"])
  ]);
  const changes = status === void 0 ? void 0 : status.split("\n").filter((line) => line.trim() && !/^.. "?\.governance\//.test(line)).length;
  const remote = rawRemote ? sanitizeRemote(rawRemote) : void 0;
  const slug = remote ? repositorySlug(remote) : void 0;
  return {
    ...branch ? { branch } : {},
    ...head ? { head } : {},
    ...changes !== void 0 ? { uncommittedChanges: changes } : {},
    ...remote ? { remote } : {},
    ...slug ? { repositorySlug: slug } : {}
  };
}
async function readScripts(repository) {
  const text = await readSmallText(path6.join(repository, "package.json"));
  if (!text) return {};
  try {
    const scripts = JSON.parse(text).scripts;
    if (typeof scripts !== "object" || scripts === null || Array.isArray(scripts)) return {};
    return Object.fromEntries(Object.entries(scripts).filter(([, value]) => typeof value === "string"));
  } catch {
    return {};
  }
}
async function readCi(repository) {
  const directory = path6.join(repository, ".github", "workflows");
  let names;
  try {
    names = (await readdir2(directory)).filter((name) => /\.ya?ml$/i.test(name)).sort();
  } catch {
    return [];
  }
  const workflows = [];
  for (const name of names) {
    const text = await readSmallText(path6.join(directory, name));
    if (text === void 0) continue;
    const commands = [...text.matchAll(/^[ \t]*(?:-[ \t]+)?run:[ \t]+(?![|> \t])(.+?)[ \t]*$/gm)].map((match) => match[1]).slice(0, MAX_CI_COMMANDS);
    workflows.push({ file: `.github/workflows/${name}`, commands });
  }
  return workflows;
}
async function describeRepository(root, repository) {
  const relative = path6.relative(root, repository).replaceAll("\\", "/") || ".";
  const packageManager = (await Promise.all(LOCKFILES.map(async ([file, name]) => await exists(path6.join(repository, file)) ? name : void 0))).find(Boolean);
  return {
    path: relative,
    name: path6.basename(repository),
    git: await gitFacts(repository),
    ...packageManager ? { packageManager } : {},
    scripts: await readScripts(repository),
    ci: await readCi(repository),
    docs: (await Promise.all(KNOWN_DOCS.map(async (doc) => await exists(path6.join(repository, doc)) ? doc : void 0))).filter((doc) => Boolean(doc)),
    directories: (await Promise.all(KNOWN_DIRECTORIES.map(async (directory) => {
      try {
        return (await stat(path6.join(repository, directory))).isDirectory() ? directory : void 0;
      } catch {
        return void 0;
      }
    }))).filter((directory) => Boolean(directory)),
    existingPack: await exists(path6.join(repository, ".governance", "governance-pack.json"))
  };
}
async function discoverRepositories(rootPath) {
  const root = path6.resolve(rootPath);
  const info = await stat(root).catch(() => void 0);
  if (!info?.isDirectory()) throw new Error(`Folder not found: ${rootPath}`);
  const found = [];
  async function walk(directory, depth) {
    if (await exists(path6.join(directory, ".git"))) {
      found.push(directory);
      return;
    }
    if (depth >= MAX_DEPTH) return;
    let entries;
    try {
      entries = await readdir2(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIPPED_DIRECTORIES.has(entry.name)) continue;
      await walk(path6.join(directory, entry.name), depth + 1);
    }
  }
  await walk(root, 0);
  return { root, repositories: await Promise.all(found.map((repository) => describeRepository(root, repository))) };
}
function formatDiscovery(result) {
  if (result.repositories.length === 0) {
    return `No git repositories found under ${result.root} (searched ${MAX_DEPTH} levels deep).`;
  }
  const lines = [`Found ${result.repositories.length} git ${result.repositories.length === 1 ? "repository" : "repositories"} under ${result.root}:`, ""];
  for (const repository of result.repositories) {
    const { git: facts } = repository;
    lines.push(
      `${repository.path}`,
      `  branch ${facts.branch ?? "unknown"}, head ${facts.head?.slice(0, 7) ?? "unknown"}, uncommitted changes: ${facts.uncommittedChanges ?? "unknown"}`,
      `  remote ${facts.repositorySlug ?? facts.remote ?? "none"}`,
      `  package manager ${repository.packageManager ?? "unknown"}; scripts: ${Object.keys(repository.scripts).join(", ") || "none"}`,
      `  CI: ${repository.ci.map((workflow) => `${workflow.file} (${workflow.commands.length} commands)`).join(", ") || "none"}`,
      `  docs: ${repository.docs.join(", ") || "none"}; pack: ${repository.existingPack ? "exists" : "none"}`,
      ""
    );
  }
  return lines.join("\n").trimEnd();
}

// src/summary.ts
import { readdir as readdir3 } from "node:fs/promises";
import path8 from "node:path";

// src/init.ts
import { lstat as lstat3, mkdir, open, realpath as realpath3, stat as stat2 } from "node:fs/promises";
import path7 from "node:path";
var PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
var UNSET_REPOSITORY = "UNSET";
var DEFAULT_ENVIRONMENT = "development";
function slugifyProjectId(value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z0-9]+/, "").replace(/-+$/, "");
  return PROJECT_ID_PATTERN.test(slug) ? slug : void 0;
}
function buildGovernancePackSkeleton(project) {
  return {
    version: "1.0.0",
    project,
    change: {
      id: "CHG-UNSPECIFIED",
      type: "configuration",
      title: "Governance baseline (change not yet described)",
      risk_class: "C",
      files: []
    },
    standards: [],
    controls: [],
    evidence: [],
    risks: [],
    decisions: [],
    exceptions: [],
    debt: []
  };
}
function isInside(root, target) {
  const relative = path7.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path7.sep}`) && !path7.isAbsolute(relative);
}
async function createNewFile(rootPath, relativePath, content) {
  const root = await realpath3(rootPath);
  const target = path7.resolve(root, relativePath);
  if (!isInside(root, target)) throw new Error(`Path escapes repository root: ${relativePath}`);
  let directory = root;
  for (const part of path7.relative(root, path7.dirname(target)).split(path7.sep).filter(Boolean)) {
    directory = path7.join(directory, part);
    try {
      const info = await lstat3(directory);
      if (info.isSymbolicLink() || !info.isDirectory()) {
        throw new Error(`Refusing to write through ${path7.relative(root, directory)}: it is not a plain directory.`);
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await mkdir(directory);
    }
  }
  let handle;
  try {
    handle = await open(target, "wx");
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(`${relativePath} already exists; it was not overwritten.`);
    }
    throw error;
  }
  try {
    await handle.writeFile(content, "utf8");
  } finally {
    await handle.close();
  }
}
async function initializeGovernancePack(options) {
  const repositoryPath = path7.resolve(options.repositoryPath);
  let info;
  try {
    info = await stat2(repositoryPath);
  } catch {
    throw new Error(`Repository not found: ${options.repositoryPath}`);
  }
  if (!info.isDirectory()) throw new Error(`Repository is not a directory: ${options.repositoryPath}`);
  const id = options.id ?? slugifyProjectId(path7.basename(repositoryPath));
  if (id === void 0 || !PROJECT_ID_PATTERN.test(id)) {
    throw new Error(
      options.id === void 0 ? "Could not derive a project id from the directory name; pass --id <lowercase-slug>." : `Invalid --id '${options.id}': use lowercase letters, digits, '.', '_' or '-', starting with a letter or digit.`
    );
  }
  const project = {
    id,
    name: options.name?.trim() || path7.basename(repositoryPath) || id,
    repository: options.repository?.trim() || UNSET_REPOSITORY,
    environment: options.environment?.trim() || DEFAULT_ENVIRONMENT
  };
  const content = `${JSON.stringify(buildGovernancePackSkeleton(project), null, 2)}
`;
  await loadGovernancePack(repositoryPath, options.packPath, { readTextFile: async () => content });
  await createNewFile(repositoryPath, options.packPath, content);
  return { packPath: options.packPath.replaceAll("\\", "/"), project };
}
function formatInitResult(result) {
  const { project } = result;
  return [
    `Created ${result.packPath} for project "${project.id}".`,
    "",
    "This pack asserts nothing. It has no controls, evidence, risks or decisions, so",
    "`governance check` returns NO-GO (no control applied, nothing was evaluated) until real ones are added.",
    "",
    "Fill in:",
    `  project.repository   currently "${project.repository}"`,
    `  project.environment  currently "${project.environment}"`,
    "  change               the change being assessed: id, type, title, risk class and files",
    "",
    "Then:",
    "  1. Add the controls that apply to this project, each tied to a standard, and the evidence that supports them.",
    "     Declared status is not proof: evidence must come from real checks or reviews.",
    "  2. governance validate <repository>",
    "  3. governance check <repository>"
  ].join("\n");
}

// src/summary.ts
var REVIEW_AREAS = ["security", "architecture", "api", "data", "testing", "cicd", "frontend", "observability"];
var AREA_STANDARD = {
  security: "SEC-007",
  architecture: "ARC-002",
  api: "API-006",
  data: "DB-005",
  testing: "QA-008",
  cicd: "CICD-012",
  frontend: "FE-004",
  observability: "OBS-014"
};
var PACK_PATH = ".governance/governance-pack.json";
var REPORTS_DIRECTORY = ".governance/reports";
var severityRank4 = { P0: 0, P1: 1, P2: 2, P3: 3 };
function oneLine2(value, limit = 140) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > limit ? `${collapsed.slice(0, limit - 1)}\u2026` : collapsed;
}
function cell2(value) {
  return oneLine2(value).replaceAll("|", "\\|");
}
function areaSignal(area, repository) {
  switch (area) {
    case "data":
      return repository.directories.includes("migrations") ? "has a migrations/ directory" : void 0;
    case "api":
      return repository.directories.includes("contracts") ? "has a contracts/ directory" : void 0;
    case "testing":
      return repository.directories.includes("tests") || repository.directories.includes("test") || "test" in repository.scripts ? "has tests or a test script" : void 0;
    case "cicd":
      return repository.ci.length > 0 ? "has CI workflows" : void 0;
    default:
      return void 0;
  }
}
async function listReviewReports(repositoryPath) {
  try {
    return (await readdir3(path8.join(repositoryPath, REPORTS_DIRECTORY))).filter((name) => /^review-.+\.md$/.test(name)).sort();
  } catch {
    return [];
  }
}
function lastReviews(reports, pack) {
  const latest = /* @__PURE__ */ new Map();
  for (const file of reports) {
    const match = /^review-([a-z]+)-(\d{4}-\d{2}-\d{2})(?:-(\d+))?\.md$/.exec(file);
    const area = REVIEW_AREAS.find((candidate) => candidate === match?.[1]);
    if (!match || !area) continue;
    const date = match[2];
    const run2 = match[3] ? Number(match[3]) : 1;
    const current = latest.get(area);
    if (!current || date > current.date || date === current.date && run2 > current.run) {
      const evidenceId = `EVD-REVIEW-${area.toUpperCase()}-${date.replaceAll("-", "")}`;
      const coverage = pack?.evidence.find((item) => item.id === evidenceId)?.description;
      latest.set(area, { date, file, run: run2, ...coverage ? { coverage: oneLine2(coverage, 160) } : {} });
    }
  }
  return new Map([...latest].map(([area, { run: _run, ...review }]) => [area, review]));
}
function findingArea(finding) {
  return REVIEW_AREAS.find((area) => finding.category === area || finding.rule_id === `REVIEW-${area.toUpperCase()}`);
}
async function summarizeRepository(repositoryPath, now = /* @__PURE__ */ new Date()) {
  const root = path8.resolve(repositoryPath);
  const discovered = (await discoverRepositories(root)).repositories.find((repository) => repository.path === ".");
  if (!discovered) throw new Error(`Not a git repository root: ${repositoryPath}. Run summarize at a repository's top level.`);
  let pack;
  try {
    pack = await loadGovernancePack(root, PACK_PATH, nodeFileSystem);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("Governance pack not found")) throw error;
  }
  let assessment;
  let evaluated = [];
  if (pack) {
    const snapshot = await loadRepositorySnapshot(root, nodeFileSystem, []);
    const result = await runGovernanceCommand({ snapshot, governancePack: pack, json: true });
    evaluated = result.evaluation.controls;
    const brief = (violation) => ({ id: violation.controlId, severity: violation.severity, message: oneLine2(violation.message, 200) });
    assessment = {
      decision: result.evaluation.decision.status,
      ...result.context.analysisStatus ? { analysisStatus: result.context.analysisStatus } : {},
      blocking: result.evaluation.decision.blockingViolations.map(brief),
      conditions: result.evaluation.decision.warnings.map(brief)
    };
  }
  const controls = (pack?.controls ?? []).map((control) => {
    const evaluation = evaluated.find((item) => item.controlId === control.id);
    return {
      id: control.id,
      standard: control.standard,
      severity: control.severity,
      status: evaluation?.status ?? "UNEVALUATED",
      missingEvidence: evaluation?.missingEvidence ?? []
    };
  });
  const findings = pack?.findings ?? [];
  const bySeverity = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const open2 = findings.filter((finding) => finding.status !== "RESOLVED").sort((a, b) => severityRank4[a.severity] - severityRank4[b.severity] || a.id.localeCompare(b.id));
  for (const finding of open2) bySeverity[finding.severity] += 1;
  const reports = await listReviewReports(root);
  const reviews = lastReviews(reports, pack);
  const areas = REVIEW_AREAS.map((area) => {
    const standard = AREA_STANDARD[area];
    const areaControls = controls.filter((control) => control.standard === standard);
    const signal = areaSignal(area, discovered);
    const lastReview = reviews.get(area);
    return {
      area,
      standard,
      controls: areaControls.length,
      controlsNotPassing: areaControls.filter((control) => control.status !== "PASS").length,
      ...lastReview ? { lastReview } : {},
      openFindings: open2.filter((finding) => findingArea(finding) === area).length,
      ...signal ? { signal } : {},
      possibleGap: Boolean(signal) && areaControls.length === 0
    };
  });
  return {
    generatedOn: now.toISOString().slice(0, 10),
    repository: {
      path: path8.basename(root),
      ...discovered.git.branch ? { branch: discovered.git.branch } : {},
      ...discovered.git.head ? { head: discovered.git.head } : {},
      ...discovered.git.uncommittedChanges !== void 0 ? { uncommittedChanges: discovered.git.uncommittedChanges } : {}
    },
    ...pack ? {
      pack: {
        project: pack.project.id,
        change: pack.change.id,
        standards: pack.standards.length,
        controls: pack.controls.length,
        evidence: pack.evidence.length,
        findings: findings.length
      }
    } : {},
    ...assessment ? { assessment } : {},
    controls,
    findings: {
      bySeverity,
      total: findings.length,
      open: open2.map((finding) => ({
        id: finding.id,
        severity: finding.severity,
        status: finding.status,
        ...finding.source_location ? { location: `${finding.source_location.file}${finding.source_location.start_line ? `:${finding.source_location.start_line}` : ""}` } : {},
        message: oneLine2(finding.message, 200)
      }))
    },
    areas,
    reviewReports: reports
  };
}
function formatSummaryMarkdown(summary) {
  const { repository, pack, assessment } = summary;
  const lines = [
    `# Governance status: ${repository.path}`,
    "",
    `Generated ${summary.generatedOn} by \`governance summarize\`. Everything in this part is computed from the repository, its governance pack and its saved review reports; none of it is estimated. A "Suggestions" section after it, if present, is written by an AI and is separate.`,
    "",
    "## Snapshot",
    "",
    "| | |",
    "|---|---|",
    `| Commit | ${repository.head ? repository.head.slice(0, 7) : "unknown"} on ${repository.branch ?? "unknown branch"} |`,
    `| Uncommitted changes | ${repository.uncommittedChanges ?? "unknown"} (not counting .governance/) |`,
    `| Governance pack | ${pack ? `${pack.project}, change ${pack.change}: ${pack.controls} controls, ${pack.evidence} evidence records, ${pack.findings} findings` : "**none** (run /engineering-governance:setup)"} |`,
    `| Decision | ${assessment ? `**${assessment.decision.replace(/_/g, " ")}**` : "not assessed: no pack"} |`,
    `| Analysis status | ${assessment?.analysisStatus ?? "not run"} |`,
    ""
  ];
  if (assessment) {
    lines.push("## Decision", "");
    if (assessment.blocking.length === 0) lines.push("No blocking violations.", "");
    else lines.push(`${assessment.blocking.length} blocking:`, "", ...assessment.blocking.map((item) => `- **${item.severity}** \`${item.id}\`: ${oneLine2(item.message)}`), "");
    if (assessment.conditions.length > 0) {
      lines.push(`${assessment.conditions.length} condition${assessment.conditions.length === 1 ? "" : "s"}:`, "", ...assessment.conditions.map((item) => `- **${item.severity}** \`${item.id}\`: ${oneLine2(item.message)}`), "");
    }
  }
  lines.push("## Controls", "");
  if (summary.controls.length === 0) lines.push("None defined.", "");
  else {
    lines.push("| Control | Standard | Severity | Status | Missing evidence |", "|---|---|---|---|---|");
    for (const control of summary.controls) {
      lines.push(`| ${cell2(control.id)} | ${cell2(control.standard)} | ${control.severity} | ${control.status} | ${cell2(control.missingEvidence.join(", ") || "none")} |`);
    }
    lines.push("");
  }
  const counts = summary.findings.bySeverity;
  lines.push("## Findings", "", `${summary.findings.open.length} open of ${summary.findings.total} (P0: ${counts.P0}, P1: ${counts.P1}, P2: ${counts.P2}, P3: ${counts.P3}).`, "");
  if (summary.findings.open.length > 0) {
    lines.push("| Finding | Severity | Status | Where | Summary |", "|---|---|---|---|---|");
    for (const finding of summary.findings.open) {
      lines.push(`| ${cell2(finding.id)} | ${finding.severity} | ${finding.status} | ${cell2(finding.location ?? "")} | ${cell2(finding.message)} |`);
    }
    lines.push("");
  }
  lines.push(
    "## Review coverage",
    "",
    'One row per review area. A control belongs to an area through its standard. A signal is something found in the repository that suggests the area matters; "possible gap" means that signal is present but the pack has no control for the area. It is a prompt to check, not a verdict.',
    "",
    "| Area | Standard | Controls (not passing) | Last review | Open findings | Repository signal |",
    "|---|---|---|---|---|---|"
  );
  for (const area of summary.areas) {
    const review = area.lastReview ? `${area.lastReview.date} (${cell2(area.lastReview.file)})` : "**not reviewed**";
    const signal = area.signal ? `${area.signal}${area.possibleGap ? ", **possible gap: no controls**" : ""}` : "";
    lines.push(`| ${area.area} | ${area.standard} | ${area.controls} (${area.controlsNotPassing}) | ${review} | ${area.openFindings} | ${signal} |`);
  }
  lines.push("");
  const covered = summary.areas.filter((area) => area.lastReview);
  if (covered.length > 0) {
    lines.push("Coverage recorded by each review:", "", ...covered.map((area) => `- ${area.area}: ${area.lastReview.coverage ?? "no evidence record found in the pack for this report"}`), "");
  }
  const notReviewed = summary.areas.filter((area) => !area.lastReview).map((area) => area.area);
  lines.push(
    "## Not covered",
    "",
    notReviewed.length === 0 ? "Every area has at least one review." : `Not yet reviewed: ${notReviewed.join(", ")}.`,
    "",
    "A review reads a sample of an area, one run at a time, and an AI review can be wrong or miss things. This status does not show that the software is correct, secure or production-ready.",
    ""
  );
  return lines.join("\n");
}
async function writeDatedReport(repositoryPath, prefix, date, markdown) {
  const root = path8.resolve(repositoryPath);
  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const relative = `${REPORTS_DIRECTORY}/${prefix}-${date}${attempt === 1 ? "" : `-${attempt}`}.md`;
    try {
      await createNewFile(root, relative, markdown);
      return relative;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("already exists")) throw error;
    }
  }
  throw new Error(`Too many ${prefix} reports for one day; remove old ones.`);
}
async function writeSummary(repositoryPath, summary) {
  return writeDatedReport(repositoryPath, "summary", summary.generatedOn, `${formatSummaryMarkdown(summary)}
`);
}

// src/git-scope.ts
import { execFile as execFile3 } from "node:child_process";
import { realpath as realpath4 } from "node:fs/promises";
var GIT_TIMEOUT_MS2 = 1e4;
var GIT_MAX_BUFFER = 1e6;
var nodeGitCommandRunner = {
  async run(args, cwd, timeoutMs) {
    return new Promise((resolve, reject) => {
      execFile3(
        "git",
        args,
        {
          cwd,
          timeout: timeoutMs,
          maxBuffer: GIT_MAX_BUFFER,
          windowsHide: true,
          encoding: "utf8",
          env: {
            PATH: process.env.PATH ?? "",
            SystemRoot: process.env.SystemRoot ?? "",
            HOME: process.env.HOME ?? "",
            GIT_CONFIG_NOSYSTEM: "1",
            GIT_TERMINAL_PROMPT: "0",
            GIT_OPTIONAL_LOCKS: "0"
          }
        },
        (error, stdout, stderr) => {
          if (!error) {
            resolve({ exitCode: 0, stdout, stderr });
            return;
          }
          const exitCode = typeof error.code === "number" ? error.code : void 0;
          if (exitCode !== void 0) {
            resolve({ exitCode, stdout, stderr });
            return;
          }
          reject(error);
        }
      );
    });
  }
};
function unverifiedScope(baseRef, reason) {
  return { status: "UNVERIFIED", baseRef, files: [], reason };
}
async function loadGitChangeScope(repositoryRoot, baseRef, runner = nodeGitCommandRunner) {
  const normalizedBase = baseRef.trim();
  if (!normalizedBase || normalizedBase.startsWith("-") || normalizedBase.includes("\0") || /[\r\n]/.test(normalizedBase)) {
    return unverifiedScope(baseRef, "The base revision is empty or contains unsupported characters.");
  }
  try {
    const root = await realpath4(repositoryRoot);
    const topResult = await runner.run(["rev-parse", "--show-toplevel"], root, GIT_TIMEOUT_MS2);
    if (topResult.exitCode !== 0) {
      return unverifiedScope(normalizedBase, topResult.stderr.trim() || "The scan root is not a Git repository.");
    }
    const gitRoot = await realpath4(topResult.stdout.trim());
    if (gitRoot !== root) {
      return unverifiedScope(normalizedBase, "The scan root must be the Git top-level directory for changed-file paths to be reliable.");
    }
    const baseResult = await runner.run(
      ["rev-parse", "--verify", "--end-of-options", `${normalizedBase}^{commit}`],
      root,
      GIT_TIMEOUT_MS2
    );
    if (baseResult.exitCode !== 0 || !baseResult.stdout.trim()) {
      return unverifiedScope(normalizedBase, baseResult.stderr.trim() || "The base revision could not be resolved.");
    }
    const headResult = await runner.run(
      ["rev-parse", "--verify", "--end-of-options", "HEAD^{commit}"],
      root,
      GIT_TIMEOUT_MS2
    );
    if (headResult.exitCode !== 0 || !headResult.stdout.trim()) {
      return unverifiedScope(normalizedBase, headResult.stderr.trim() || "HEAD could not be resolved.");
    }
    const baseCommit = baseResult.stdout.trim();
    const headCommit = headResult.stdout.trim();
    const diffArguments = [
      "diff",
      "--name-only",
      "-z",
      "--diff-filter=ACDMRT",
      "--no-ext-diff",
      "--no-textconv"
    ];
    const committedDiff = await runner.run(
      [...diffArguments, `${baseCommit}...${headCommit}`, "--"],
      root,
      GIT_TIMEOUT_MS2
    );
    if (committedDiff.exitCode !== 0) {
      return unverifiedScope(normalizedBase, committedDiff.stderr.trim() || "Git could not compute the committed diff.");
    }
    const workingTreeDiff = await runner.run(
      [...diffArguments, "HEAD", "--"],
      root,
      GIT_TIMEOUT_MS2
    );
    if (workingTreeDiff.exitCode !== 0) {
      return unverifiedScope(normalizedBase, workingTreeDiff.stderr.trim() || "Git could not compute the working-tree diff.");
    }
    const untrackedFiles = await runner.run(
      ["ls-files", "--others", "--exclude-standard", "-z"],
      root,
      GIT_TIMEOUT_MS2
    );
    if (untrackedFiles.exitCode !== 0) {
      return unverifiedScope(normalizedBase, untrackedFiles.stderr.trim() || "Git could not enumerate untracked files.");
    }
    const files = [...new Set([
      ...committedDiff.stdout.split("\0"),
      ...workingTreeDiff.stdout.split("\0"),
      ...untrackedFiles.stdout.split("\0")
    ].filter(Boolean).map((file) => file.replaceAll("\\", "/")))].sort();
    return {
      status: "VERIFIED",
      baseRef: normalizedBase,
      headRef: headCommit,
      files
    };
  } catch (error) {
    return unverifiedScope(
      normalizedBase,
      `Git change-scope verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// src/exceptions.ts
import { spawn } from "node:child_process";
import { mkdir as mkdir3, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path10 from "node:path";

// src/history.ts
import { createHash as createHash3 } from "node:crypto";
import { appendFile, mkdir as mkdir2, readFile as readFile3 } from "node:fs/promises";
import path9 from "node:path";
var HISTORY_PATH = ".governance/history/assessments.jsonl";
var GENESIS = "0".repeat(64);
var nodeHistoryStore = {
  async read(repositoryPath) {
    try {
      return await readFile3(path9.join(repositoryPath, HISTORY_PATH), "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return void 0;
      throw error;
    }
  },
  async append(repositoryPath, line) {
    const file = path9.join(repositoryPath, HISTORY_PATH);
    await mkdir2(path9.dirname(file), { recursive: true });
    await appendFile(file, `${line}
`, "utf8");
  }
};
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== void 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
var sha256 = (text) => createHash3("sha256").update(text).digest("hex");
function hashRecord(record) {
  return sha256(canonical(record));
}
function assessmentFacts(pack, packText, evaluation, findings, head, repositoryFingerprint) {
  const issues = [
    ...evaluation.violations.map((v) => ({ key: `violation:${v.controlId}`, severity: v.severity, status: v.status, message: v.message })),
    ...findings.map((f) => ({ key: `finding:${f.id}`, severity: f.severity, status: f.status, message: f.message }))
  ].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  return {
    decision: evaluation.decision.status,
    reason: evaluation.decision.reason,
    project: pack.project.id,
    change: pack.change.id,
    pack_sha256: sha256(packText),
    ...head ? { head } : {},
    ...repositoryFingerprint ? { repository_fingerprint: repositoryFingerprint } : {},
    issues,
    evidence: Object.fromEntries(pack.evidence.map((e) => [e.id, e.status]))
  };
}
function verifyHistory(text) {
  const records = [];
  const lines = (text ?? "").split("\n").filter((line) => line.trim() !== "");
  let previous = GENESIS;
  for (const [index, line] of lines.entries()) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      throw new Error(`History is corrupt: line ${index + 1} is not valid JSON.`);
    }
    const { hash, ...rest } = record;
    if (record.seq !== index + 1) throw new Error(`History is corrupt: line ${index + 1} has sequence ${record.seq}.`);
    if (record.prev_hash !== previous) throw new Error(`History chain is broken at record ${record.seq}: it does not follow the record before it.`);
    if (hash !== hashRecord(rest)) throw new Error(`History was altered: record ${record.seq} does not match its hash.`);
    records.push(record);
    previous = hash;
  }
  return records;
}
async function recordAssessment(store, repositoryPath, assessment, now = /* @__PURE__ */ new Date()) {
  const records = verifyHistory(await store.read(repositoryPath));
  const last = records.at(-1);
  const body = {
    seq: (last?.seq ?? 0) + 1,
    recorded_at: now.toISOString(),
    prev_hash: last?.hash ?? GENESIS,
    assessment
  };
  const record = { ...body, hash: hashRecord(body) };
  await store.append(repositoryPath, canonical(record));
  return record;
}
async function readHistory(store, repositoryPath) {
  return verifyHistory(await store.read(repositoryPath));
}
function issueLifecycles(records) {
  const byKey = /* @__PURE__ */ new Map();
  for (const record of records) {
    const present = new Set(record.assessment.issues.map((i) => i.key));
    for (const issue of record.assessment.issues) {
      const known = byKey.get(issue.key);
      if (!known) {
        byKey.set(issue.key, { key: issue.key, severity: issue.severity, message: issue.message, first_seen: record.seq, last_seen: record.seq, state: "OPEN", reopened: false });
      } else {
        if (known.state === "RESOLVED") known.reopened = true;
        Object.assign(known, { last_seen: record.seq, severity: issue.severity, message: issue.message, state: "OPEN" });
        delete known.resolved_at;
      }
    }
    for (const known of byKey.values()) {
      if (!present.has(known.key) && known.state === "OPEN") {
        known.state = "RESOLVED";
        known.resolved_at = record.seq;
      }
    }
  }
  return [...byKey.values()];
}
function diffAssessments(records, a, b) {
  const find = (seq) => {
    const record = records.find((r) => r.seq === seq);
    if (!record) throw new Error(`No assessment ${seq} in the history (it holds ${records.length}).`);
    return record;
  };
  const from = find(a);
  const to = find(b);
  const before = new Map(from.assessment.issues.map((i) => [i.key, i]));
  const after = new Map(to.assessment.issues.map((i) => [i.key, i]));
  const ids = [.../* @__PURE__ */ new Set([...Object.keys(from.assessment.evidence), ...Object.keys(to.assessment.evidence)])].sort();
  return {
    from: a,
    to: b,
    decision: { from: from.assessment.decision, to: to.assessment.decision },
    pack_changed: from.assessment.pack_sha256 !== to.assessment.pack_sha256,
    head: { ...from.assessment.head ? { from: from.assessment.head } : {}, ...to.assessment.head ? { to: to.assessment.head } : {} },
    introduced: [...after.values()].filter((i) => !before.has(i.key)),
    resolved: [...before.values()].filter((i) => !after.has(i.key)),
    changed: [...after.values()].flatMap((i) => {
      const old = before.get(i.key);
      return old && `${old.severity}/${old.status}` !== `${i.severity}/${i.status}` ? [{ key: i.key, from: `${old.severity}/${old.status}`, to: `${i.severity}/${i.status}` }] : [];
    }),
    evidence: ids.flatMap((id) => {
      const x = from.assessment.evidence[id] ?? "(absent)";
      const y = to.assessment.evidence[id] ?? "(absent)";
      return x === y ? [] : [{ id, from: x, to: y }];
    })
  };
}
function formatHistory(records) {
  if (records.length === 0) return `No assessments recorded yet. Run \`governance check <repository> --record\` to start ${HISTORY_PATH}.`;
  const lines = [`# Assessment history (${records.length}, chain verified)`, "", "| # | Recorded | Decision | Issues | Head |", "|---|---|---|---|---|"];
  for (const r of records) {
    lines.push(`| ${r.seq} | ${r.recorded_at} | ${r.assessment.decision} | ${r.assessment.issues.length} | ${r.assessment.head?.slice(0, 8) ?? "-"} |`);
  }
  const lifecycles = issueLifecycles(records);
  lines.push("", "## Issue lifecycle", "");
  if (lifecycles.length === 0) lines.push("No issues have ever been recorded.");
  else {
    lines.push("| Issue | Severity | State | First seen | Last seen | Resolved at |", "|---|---|---|---|---|---|");
    for (const l of lifecycles) {
      lines.push(`| ${l.key}${l.reopened ? " (reopened)" : ""} | ${l.severity} | ${l.state} | #${l.first_seen} | #${l.last_seen} | ${l.resolved_at ? `#${l.resolved_at}` : "-"} |`);
    }
  }
  return lines.join("\n");
}
function formatDiff(d) {
  const issue = (i) => `- ${i.key} (${i.severity}, ${i.status}): ${i.message}`;
  const section = (title, items) => ["", `## ${title}`, "", ...items.length ? items : ["None."]];
  return [
    `# Assessment #${d.from} to #${d.to}`,
    "",
    `Decision: ${d.decision.from} to ${d.decision.to}${d.decision.from === d.decision.to ? " (unchanged)" : ""}`,
    `Governance pack: ${d.pack_changed ? "changed" : "unchanged"}`,
    `Git head: ${d.head.from?.slice(0, 8) ?? "-"} to ${d.head.to?.slice(0, 8) ?? "-"}`,
    ...section("Resolved", d.resolved.map(issue)),
    ...section("Introduced", d.introduced.map(issue)),
    ...section("Changed", d.changed.map((c) => `- ${c.key}: ${c.from} to ${c.to}`)),
    ...section("Evidence status changes", d.evidence.map((e) => `- ${e.id}: ${e.from} to ${e.to}`))
  ].join("\n");
}

// src/exceptions.ts
var APPROVALS_DIRECTORY = ".governance/approvals";
function exceptionIn(pack, id) {
  const found = (pack.exceptions ?? []).find((item) => item.id === id);
  if (!found) throw new Error(`No exception ${id} in the governance pack.`);
  return found;
}
function replaceException(pack, next) {
  return { ...pack, exceptions: (pack.exceptions ?? []).map((item) => item.id === next.id ? next : item) };
}
function parseExpiry(value, now) {
  if (!value) throw new Error("--expires is required (a date such as 2026-12-31, or a full timestamp).");
  const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.000Z` : value;
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) throw new Error(`--expires is not a valid date or timestamp: ${value}`);
  if (parsed <= now.getTime()) throw new Error(`--expires ${value} is not in the future.`);
  return new Date(parsed).toISOString();
}
function requestException(pack, input, now) {
  if ((pack.exceptions ?? []).some((item) => item.id === input.id)) throw new Error(`Exception ${input.id} already exists; ids are never reused.`);
  if (!pack.controls.some((control) => control.id === input.control)) throw new Error(`Control ${input.control} is not in the governance pack.`);
  const record = {
    id: input.id,
    status: "REQUESTED",
    control: input.control,
    reason: input.reason,
    project_id: pack.project.id,
    change_id: pack.change.id,
    requested_by: input.requestedBy,
    requested_at: now.toISOString()
  };
  return { ...pack, exceptions: [...pack.exceptions ?? [], record] };
}
function approve(pack, existing, input, now) {
  if (existing.requested_by?.trim().toLowerCase() === input.by.trim().toLowerCase()) {
    throw new Error("The requester cannot approve their own exception (EXC-021 section 15).");
  }
  const expiresAt = parseExpiry(input.expires, now);
  const { approval_signature: _stale, ...rest } = existing;
  const next = {
    ...rest,
    status: "APPROVED",
    approved_by: input.by,
    approved_at: now.toISOString(),
    expires_at: expiresAt,
    ...input.role ? { approver_role: input.role } : {}
  };
  if (!input.role) delete next.approver_role;
  return replaceException(pack, next);
}
function approveException(pack, id, input, now) {
  const existing = exceptionIn(pack, id);
  if (existing.status !== "REQUESTED") throw new Error(`Exception ${id} is ${existing.status}; only a REQUESTED exception can be approved (use renew for an expired one).`);
  return approve(pack, existing, input, now);
}
function renewException(pack, id, input, now) {
  const existing = exceptionIn(pack, id);
  if (existing.status !== "APPROVED" && existing.status !== "EXPIRED") throw new Error(`Exception ${id} is ${existing.status}; only an APPROVED or EXPIRED exception can be renewed.`);
  const next = approve(pack, existing, input, now);
  const renewed = exceptionIn(next, id);
  if (existing.expires_at && Date.parse(renewed.expires_at) <= Date.parse(existing.expires_at)) {
    throw new Error(`A renewal must extend the exception beyond its current expiry (${existing.expires_at}).`);
  }
  return next;
}
function expireExceptions(pack, now) {
  const expired = [];
  const exceptions = (pack.exceptions ?? []).map((item) => {
    if (item.status === "APPROVED" && item.expires_at && Date.parse(item.expires_at) <= now.getTime()) {
      expired.push(item.id);
      return { ...item, status: "EXPIRED" };
    }
    return item;
  });
  return { pack: { ...pack, exceptions }, expired };
}
function exceptionRows(pack, now, warnDays = 14) {
  return (pack.exceptions ?? []).map((item) => {
    const days = item.status === "APPROVED" ? daysUntil(item.expires_at, now.toISOString()) : void 0;
    const note = item.status === "REQUESTED" ? "awaiting approval" : item.status === "EXPIRED" ? "expired; renew or close" : days === void 0 ? "" : days <= 0 ? "LAPSED (run exception expire)" : days <= warnDays ? `expiring in ${days} day${days === 1 ? "" : "s"}` : "";
    return { id: item.id, control: item.control ?? "", status: item.status, ...item.expires_at ? { expires_at: item.expires_at } : {}, ...days !== void 0 ? { days_left: days } : {}, note };
  });
}
function formatExceptionRows(rows) {
  if (rows.length === 0) return "No exceptions in the governance pack.";
  return [
    "| Exception | Control | Status | Expires | Note | Signature |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.id} | ${r.control} | ${r.status} | ${r.expires_at?.slice(0, 10) ?? "-"} | ${r.note || "-"} | ${r.signature ?? "-"} |`)
  ].join("\n");
}
function approvalPayload(exception) {
  const { id, control, project_id, change_id, reason, requested_by, requested_at, approved_by, approver_role, approved_at, expires_at } = exception;
  return canonical({ id, control, project_id, change_id, reason, requested_by, requested_at, approved_by, approver_role, approved_at, expires_at });
}
function runGpg(args, input, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn("gpg", args, { windowsHide: true, timeout: timeoutMs });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => reject(new Error(`Could not run gpg (${error.message}). Install GnuPG to sign or verify approvals.`)));
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.stdin.on("error", () => void 0);
    child.stdin.end(input);
  });
}
var gpgSignaturePort = {
  async sign(payload, keyId) {
    const result = await runGpg(["--armor", "--detach-sign", "--local-user", keyId], payload, 12e4);
    if (result.code !== 0) throw new Error(`gpg could not sign with key ${keyId}: ${result.stderr.trim()}`);
    return result.stdout;
  },
  async verify(signature, payload) {
    const directory = await mkdtemp(path10.join(os.tmpdir(), "governance-sig-"));
    try {
      const file = path10.join(directory, "approval.asc");
      await writeFile(file, signature, "utf8");
      const result = await runGpg(["--batch", "--no-tty", "--status-fd", "1", "--verify", file, "-"], payload, 3e4);
      const status = result.stdout.split("\n").filter((line) => line.startsWith("[GNUPG:] "));
      const has = (tag) => status.some((line) => line.startsWith(`[GNUPG:] ${tag} `));
      const good = result.code === 0 && has("GOODSIG") && has("VALIDSIG");
      const fingerprints = status.filter((line) => line.startsWith("[GNUPG:] VALIDSIG ")).flatMap((line) => {
        const f = line.split(" ");
        return [f[2], f[11]];
      }).filter((value) => !!value && /^[0-9A-Fa-f]{40,64}$/.test(value)).map((value) => value.toUpperCase());
      const detail = good ? "good signature" : has("EXPKEYSIG") ? "signing key has expired" : has("REVKEYSIG") ? "signing key was revoked" : has("ERRSIG") ? "signing key is not in the keyring" : has("BADSIG") ? "bad signature (the approval was changed after signing)" : "signature could not be verified";
      return { good, fingerprints, detail };
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
};
var normalizeFingerprint = (value) => value.replaceAll(" ", "").toUpperCase();
function approverKeys(policy, approver, role) {
  const wanted = approver.trim().toLowerCase();
  return policy.roles.filter((r) => r.status === "APPROVED" && (!role || r.id === role)).flatMap((r) => r.holders).filter((h) => [h.name, h.handle].some((x) => x && x.toLowerCase() === wanted)).flatMap((h) => h.key_fingerprint ? [normalizeFingerprint(h.key_fingerprint)] : []);
}
async function verifyApprovals(pack, policy, gpg, readFileText) {
  const checks = [];
  for (const item of (pack.exceptions ?? []).filter((e) => e.status === "APPROVED")) {
    const fail = (detail) => {
      checks.push({ id: item.id, verified: false, detail });
    };
    if (!item.approval_signature) {
      fail("no approval_signature recorded");
      continue;
    }
    const signature = await readFileText(item.approval_signature).catch(() => void 0);
    if (signature === void 0) {
      fail(`signature file ${item.approval_signature} not found`);
      continue;
    }
    const keys = approverKeys(policy, item.approved_by ?? "", item.approver_role);
    if (keys.length === 0) {
      fail(`no registered key for ${item.approved_by ?? "(unnamed approver)"} in the authority policy`);
      continue;
    }
    const result = await gpg.verify(signature, approvalPayload(item));
    if (!result.good) {
      fail(result.detail);
      continue;
    }
    if (!result.fingerprints.some((f) => keys.includes(f))) {
      fail("signed by a key that is not registered for the approver");
      continue;
    }
    checks.push({ id: item.id, verified: true, detail: "good signature from the approver's registered key" });
  }
  return checks;
}
async function signApproval(repositoryPath, exception, keyId, gpg) {
  const armored = await gpg.sign(approvalPayload(exception), keyId);
  const relative = `${APPROVALS_DIRECTORY}/${exception.id}.asc`;
  await mkdir3(path10.join(repositoryPath, APPROVALS_DIRECTORY), { recursive: true });
  await writeFile(path10.join(repositoryPath, relative), armored, "utf8");
  return relative;
}
async function writePack(repositoryPath, packPath, pack) {
  const root = path10.resolve(repositoryPath);
  const target = path10.resolve(root, packPath);
  const relative = path10.relative(root, target);
  if (relative.startsWith("..") || path10.isAbsolute(relative)) throw new Error(`Pack path escapes the repository: ${packPath}`);
  await writeFile(target, `${JSON.stringify(pack, null, 2)}
`, "utf8");
}

// src/index.ts
var VERSION = "0.6.0";
var DEFAULT_PACK_PATH = ".governance/governance-pack.json";
function usage() {
  return [
    "Engineering Governance CLI",
    "",
    "Usage:",
    "  governance check <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--record] [--verify-signatures] [--json]",
    "  governance validate <repository> [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>]",
    "  governance report <repository> [--write] [--pack <relative-path>] [--profile <relative-path>] [--registry <relative-path>] [--catalog <relative-path>] [--authority <relative-path>] [--project <id>] [--base <git-ref>] [--run-tools] [--record] [--verify-signatures] [--format markdown|json]",
    "  governance analyze <repository> [--profile <relative-path>] [--base <git-ref>] [--run-tools] [--json]",
    "  governance discover <folder> [--json]",
    "  governance summarize <repository> [--json] [--write]",
    "  governance history <repository> [--json]",
    "  governance diff [<repository>] <a> <b> [--json]",
    "  governance exception request <repository> --id <EXC-id> --control <id> --reason <text> --by <name> [--pack <relative-path>]",
    "  governance exception approve <repository> --id <EXC-id> --by <name> --role <ROLE> --expires <date> [--sign <gpg-key>] [--pack <relative-path>]",
    "  governance exception renew <repository> --id <EXC-id> --by <name> --role <ROLE> --expires <date> [--sign <gpg-key>] [--pack <relative-path>]",
    "  governance exception expire <repository> [--pack <relative-path>]",
    "  governance exception list <repository> [--authority <relative-path>] [--pack <relative-path>] [--json]",
    "  governance init <repository> [--pack <relative-path>] [--id <slug>] [--name <text>] [--repo <owner/name>] [--environment <name>]",
    "  governance --help",
    "  governance --version",
    "",
    "Commands:",
    "  check     Analyze a repository, validate its governance pack, and derive a decision.",
    "  validate  Validate the governance pack, architecture profile and/or project registry; no analysis.",
    "  report    Same assessment and exit codes as check, rendered as a Markdown (default) or JSON report.",
    "  analyze   Inspect repository languages, frameworks, and analyzer coverage without a pack.",
    "  summarize One status report for a repository: decision, controls, findings and which review areas are covered, all computed from files. --write saves it to .governance/reports/.",
    "  history   Verify the hash-chained assessment history in .governance/history/ and list every recorded assessment and each issue's lifecycle (first seen, resolved, reopened).",
    "  diff      Compare two recorded assessments by number: decision, resolved and introduced issues, and evidence that changed status.",
    "  exception Manage the exception lifecycle in the pack: request, approve (with an expiry), renew (a fresh approval with a later expiry), expire (mark lapsed ones EXPIRED) and list (days left, signature status). approve and renew can GPG-sign the approval with --sign.",
    "  discover  Find the git repositories in a folder and report facts about each (scripts, CI commands, docs, git state). Read-only.",
    "  init      Create a governance pack that asserts nothing, never overwriting an existing file. check returns NO-GO until controls are added.",
    "",
    "Options:",
    `  --pack    Governance pack JSON path relative to the repository root (default: ${DEFAULT_PACK_PATH})`,
    "  --registry Project registration file or directory of .json records. validate: alone, skips the pack check.",
    "             check/report: supplies the project's pack path and architecture profile (explicit --pack/--profile win),",
    "             requires the pack to belong to the project, rejects RETIRED projects and reports unassigned owners as conditions.",
    "  --catalog  Control catalog JSON file. validate: checks it (alone, skips the pack check). check/report: the pack must",
    "             define every mandatory catalog control and may not weaken it; APPROVED controls block, DRAFT controls are conditions.",
    "  --authority Approver-authority policy JSON file. validate: checks it (alone, skips the pack check). check/report: only APPROVED",
    "             roles with a named holder confer authority; they let a P1 exception waiver or P1 risk acceptance hold. Without any,",
    "             P1 waivers and acceptances never hold.",
    "  --project  Registered project id for check/report with --registry (required when the registry holds several projects).",
    "  --profile Apply and verify an architecture profile JSON file relative to the repository root.",
    "  --base    Verify changed-file scope against a Git base revision (for example, origin/main).",
    "  --run-tools Execute installed local checks: the TypeScript compiler, Python syntax, and the osv-scanner, gitleaks and semgrep scanners (never installs anything).",
    "  --id, --name, --repo, --environment  init only: the generated pack's project id (lowercase slug), name, repository and environment.",
    "  --record  check/report: append the assessment (decision, issues, evidence statuses, pack hash, git head) to the append-only history .governance/history/assessments.jsonl. Refuses if the existing chain was altered.",
    "  --verify-signatures  check/report: with --authority, verify each approved exception's GPG signature against the approver's key_fingerprint in the policy. An approval without a verified signature does not waive the control.",
    "  --control, --reason, --by, --role, --expires, --sign  exception only: the control, reason, requester (request) or approver (approve, renew), authority role, expiry (a date or timestamp) and GPG key id.",
    "  --json    Emit machine-readable JSON.",
    "  --format  Report format for the report command: markdown (default) or json.",
    "  -h, --help",
    "  -v, --version",
    "",
    "Exit codes:",
    "  0  GO / complete analysis / pack created by init",
    "  1  GO WITH CONDITIONS / incomplete analysis",
    "  2  NO-GO",
    "  3  Invalid arguments or execution error"
  ].join("\n");
}
function parseCliArguments(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    return { command: "help", repositoryPath: ".", packPath: DEFAULT_PACK_PATH, packExplicit: false, runTools: false, json: false };
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    return { command: "version", repositoryPath: ".", packPath: DEFAULT_PACK_PATH, packExplicit: false, runTools: false, json: false };
  }
  const [rawCommand, ...rest] = argv;
  if (rawCommand !== "check" && rawCommand !== "analyze" && rawCommand !== "validate" && rawCommand !== "report" && rawCommand !== "init" && rawCommand !== "discover" && rawCommand !== "summarize" && rawCommand !== "history" && rawCommand !== "diff" && rawCommand !== "exception") {
    throw new Error(`Unknown command: ${rawCommand ?? "(empty)"}

${usage()}`);
  }
  let repositoryPath = ".";
  let packPath = DEFAULT_PACK_PATH;
  let profilePath;
  let registryPath;
  let catalogPath;
  let authorityPath;
  let projectId;
  let packExplicit = false;
  let baseRef;
  let runTools = false;
  let json = false;
  let write = false;
  let record = false;
  let verifySignatures = false;
  const exceptionOptions = {};
  let format;
  let repositoryProvided = false;
  const positionals = [];
  const initOptions = {};
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--write") {
      if (rawCommand !== "summarize" && rawCommand !== "report") throw new Error("--write is only supported by the summarize and report commands.");
      write = true;
      continue;
    }
    if (argument === "--record") {
      if (rawCommand !== "check" && rawCommand !== "report") throw new Error("--record is only supported by the check and report commands.");
      record = true;
      continue;
    }
    if (argument === "--verify-signatures") {
      if (rawCommand !== "check" && rawCommand !== "report") throw new Error("--verify-signatures is only supported by the check and report commands.");
      verifySignatures = true;
      continue;
    }
    if (argument === "--control" || argument === "--reason" || argument === "--by" || argument === "--role" || argument === "--expires" || argument === "--sign") {
      const value = rest[index + 1];
      if (rawCommand !== "exception") throw new Error(`${argument} is only supported by the exception command.`);
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      exceptionOptions[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    if (argument === "--run-tools") {
      runTools = true;
      continue;
    }
    if (argument === "--format") {
      const value = rest[index + 1];
      if (rawCommand !== "report") throw new Error("--format is only supported by the report command.");
      if (value !== "markdown" && value !== "json") throw new Error("--format must be markdown or json.");
      format = value;
      index += 1;
      continue;
    }
    if (argument === "--pack" || argument === "--profile" || argument === "--base" || argument === "--registry" || argument === "--catalog" || argument === "--authority" || argument === "--project") {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a relative path.`);
      if (argument === "--catalog" && rawCommand === "analyze") throw new Error("--catalog is only supported by the validate, check and report commands.");
      if (argument === "--authority" && rawCommand === "analyze") throw new Error("--authority is only supported by the validate, check and report commands.");
      if (argument === "--registry" && rawCommand === "analyze") throw new Error("--registry is only supported by the validate, check and report commands.");
      if (argument === "--project" && rawCommand !== "check" && rawCommand !== "report") throw new Error("--project is only supported by the check and report commands.");
      if (argument === "--pack") {
        packPath = value;
        packExplicit = true;
      } else if (argument === "--profile") profilePath = value;
      else if (argument === "--registry") registryPath = value;
      else if (argument === "--catalog") catalogPath = value;
      else if (argument === "--authority") authorityPath = value;
      else if (argument === "--project") projectId = value;
      else baseRef = value;
      index += 1;
      continue;
    }
    if (argument === "--id" || argument === "--name" || argument === "--repo" || argument === "--environment") {
      const value = rest[index + 1];
      if (rawCommand !== "init" && !(rawCommand === "exception" && argument === "--id")) throw new Error(`${argument} is only supported by the init command.`);
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      if (argument === "--id" && rawCommand === "exception") exceptionOptions.id = value;
      else if (argument === "--id") initOptions.id = value;
      else if (argument === "--name") initOptions.name = value;
      else if (argument === "--repo") initOptions.repository = value;
      else initOptions.environment = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) throw new Error(`Unknown option: ${argument}`);
    if (rawCommand === "diff" || rawCommand === "exception") {
      positionals.push(argument);
      continue;
    }
    if (repositoryProvided) throw new Error(`Unexpected argument: ${argument}`);
    repositoryPath = argument;
    repositoryProvided = true;
  }
  let exception;
  if (rawCommand === "exception") {
    const [action, maybeRepository, ...extra] = positionals;
    if (!action || !["request", "approve", "renew", "expire", "list"].includes(action) || extra.length > 0) throw new Error("exception needs an action: request, approve, renew, expire or list, then an optional repository.");
    if (maybeRepository) repositoryPath = maybeRepository;
    const require2 = (name, flag) => {
      if (!exceptionOptions[name]) throw new Error(`exception ${action} requires ${flag}.`);
    };
    if (action === "request") {
      require2("id", "--id");
      require2("control", "--control");
      require2("reason", "--reason");
      require2("by", "--by");
    }
    if (action === "approve" || action === "renew") {
      require2("id", "--id");
      require2("by", "--by");
      require2("expires", "--expires");
    }
    if (action !== "approve" && action !== "renew" && exceptionOptions.sign) throw new Error("--sign is only supported by exception approve and renew.");
    exception = { action, ...exceptionOptions };
  }
  let diff;
  if (rawCommand === "diff") {
    if (positionals.length !== 2 && positionals.length !== 3) throw new Error("diff needs two assessment numbers: governance diff [<repository>] <a> <b>.");
    if (positionals.length === 3) repositoryPath = positionals.shift();
    const [from, to] = positionals.map(Number);
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1) throw new Error("diff takes two assessment numbers (positive integers), as shown by `governance history`.");
    diff = { from, to };
  }
  if (verifySignatures && !authorityPath) throw new Error("--verify-signatures requires --authority (the policy holds each approver's key).");
  if (projectId !== void 0 && registryPath === void 0) throw new Error("--project requires --registry.");
  if (write && format === "json") throw new Error("--write saves Markdown; it cannot be combined with --format json.");
  if (rawCommand === "init" || rawCommand === "discover" || rawCommand === "summarize" || rawCommand === "history" || rawCommand === "diff") {
    const unsupported = [
      profilePath && "--profile",
      baseRef && "--base",
      registryPath && "--registry",
      catalogPath && "--catalog",
      authorityPath && "--authority",
      projectId && "--project",
      runTools && "--run-tools",
      rawCommand === "init" && json && "--json",
      format && "--format"
    ].filter(Boolean);
    if (rawCommand !== "init" && packExplicit) unsupported.unshift("--pack");
    if (unsupported.length > 0) throw new Error(`${unsupported.join(", ")} not supported by the ${rawCommand} command.`);
  }
  return {
    command: rawCommand,
    repositoryPath: path11.resolve(repositoryPath),
    packPath,
    packExplicit,
    ...registryPath ? { registryPath } : {},
    ...catalogPath ? { catalogPath } : {},
    ...authorityPath ? { authorityPath } : {},
    ...projectId ? { projectId } : {},
    ...profilePath ? { profilePath } : {},
    ...baseRef ? { baseRef } : {},
    runTools,
    json,
    ...format ? { format } : {},
    ...write ? { write: true } : {},
    ...record ? { record: true } : {},
    ...verifySignatures ? { verifySignatures: true } : {},
    ...exception ? { exception } : {},
    ...diff ? { diff } : {},
    ...rawCommand === "init" ? { init: initOptions } : {}
  };
}
async function runExceptionCommand(args) {
  const options = args.exception;
  const now = /* @__PURE__ */ new Date();
  const pack = await loadGovernancePack(args.repositoryPath, args.packPath, nodeFileSystem);
  const save = async (next2) => {
    await loadGovernancePack(args.repositoryPath, args.packPath, { readTextFile: async () => JSON.stringify(next2) });
    await writePack(args.repositoryPath, args.packPath, next2);
  };
  if (options.action === "list") {
    const rows = exceptionRows(pack, now);
    if (args.authorityPath) {
      const policy = await loadAuthorityPolicy(args.repositoryPath, args.authorityPath, nodeFileSystem);
      const checks = await verifyApprovals(pack, policy, gpgSignaturePort, (file) => nodeFileSystem.readTextFile(args.repositoryPath, file));
      for (const row of rows) {
        const check = checks.find((item) => item.id === row.id);
        if (check) row.signature = check.verified ? "verified" : `NOT verified: ${check.detail}`;
      }
    }
    process.stdout.write(`${args.json ? JSON.stringify(rows, null, 2) : formatExceptionRows(rows)}
`);
    return 0;
  }
  if (options.action === "expire") {
    const { pack: next2, expired } = expireExceptions(pack, now);
    if (expired.length > 0) await save(next2);
    process.stdout.write(expired.length > 0 ? `Marked EXPIRED: ${expired.join(", ")}
` : "No approved exception has lapsed.\n");
    return 0;
  }
  let next;
  if (options.action === "request") {
    next = requestException(pack, { id: options.id, control: options.control, reason: options.reason, requestedBy: options.by }, now);
  } else {
    const input = { by: options.by, ...options.role ? { role: options.role } : {}, expires: options.expires };
    parseExpiry(options.expires, now);
    next = (options.action === "approve" ? approveException : renewException)(pack, options.id, input, now);
    if (options.sign) {
      const approved = (next.exceptions ?? []).find((item) => item.id === options.id);
      const signaturePath = await signApproval(args.repositoryPath, approved, options.sign, gpgSignaturePort);
      next = { ...next, exceptions: (next.exceptions ?? []).map((item) => item.id === approved.id ? { ...item, approval_signature: signaturePath } : item) };
    }
  }
  await save(next);
  const saved = (next.exceptions ?? []).find((item) => item.id === options.id);
  process.stdout.write(`${options.action === "request" ? "Requested" : options.action === "approve" ? "Approved" : "Renewed"} ${saved.id}${saved.expires_at ? ` until ${saved.expires_at}` : ""}${saved.approval_signature ? `; signed (${saved.approval_signature})` : options.action === "request" ? "" : "; not signed"}
`);
  return 0;
}
async function runCli(argv) {
  let args;
  try {
    args = parseCliArguments(argv);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}
`);
    return 3;
  }
  if (args.command === "help") {
    process.stdout.write(`${usage()}
`);
    return 0;
  }
  if (args.command === "version") {
    process.stdout.write(`engineering-governance ${VERSION}
`);
    return 0;
  }
  try {
    if (args.command === "summarize") {
      const summary = await summarizeRepository(args.repositoryPath);
      if (args.write) {
        const written = await writeSummary(args.repositoryPath, summary);
        process.stdout.write(`Wrote ${written}
`);
      } else {
        process.stdout.write(`${args.json ? JSON.stringify(summary, null, 2) : formatSummaryMarkdown(summary)}
`);
      }
      return 0;
    }
    if (args.command === "exception") {
      return await runExceptionCommand(args);
    }
    if (args.command === "history") {
      const records = await readHistory(nodeHistoryStore, args.repositoryPath);
      process.stdout.write(`${args.json ? JSON.stringify(records, null, 2) : formatHistory(records)}
`);
      return 0;
    }
    if (args.command === "diff") {
      const records = await readHistory(nodeHistoryStore, args.repositoryPath);
      const result2 = diffAssessments(records, args.diff.from, args.diff.to);
      process.stdout.write(`${args.json ? JSON.stringify(result2, null, 2) : formatDiff(result2)}
`);
      return 0;
    }
    if (args.command === "discover") {
      const result2 = await discoverRepositories(args.repositoryPath);
      process.stdout.write(`${args.json ? JSON.stringify(result2, null, 2) : formatDiscovery(result2)}
`);
      return 0;
    }
    if (args.command === "init") {
      const result2 = await initializeGovernancePack({
        repositoryPath: args.repositoryPath,
        packPath: args.packPath,
        ...args.init
      });
      process.stdout.write(`${formatInitResult(result2)}
`);
      return 0;
    }
    if (args.command === "validate") {
      const validated = [];
      if (args.packExplicit || !args.registryPath && !args.catalogPath && !args.authorityPath) {
        await loadGovernancePack(args.repositoryPath, args.packPath, nodeFileSystem);
        validated.push(args.packPath);
      }
      if (args.profilePath) {
        await loadArchitectureProfile(args.repositoryPath, args.profilePath, nodeFileSystem);
        validated.push(args.profilePath);
      }
      if (args.authorityPath) {
        const authority = await loadAuthorityPolicy(args.repositoryPath, args.authorityPath, nodeFileSystem);
        const approved = authority.roles.filter((role) => role.status === "APPROVED").length;
        validated.push(`authority policy ${authority.policy_id} ${authority.policy_version} (${authority.roles.length} roles, ${approved} approved)`);
      }
      if (args.catalogPath) {
        const catalog = await loadControlCatalog(args.repositoryPath, args.catalogPath, nodeFileSystem);
        validated.push(`catalog ${catalog.catalog_id} ${catalog.catalog_version} (${catalog.controls.length} controls)`);
      }
      if (args.registryPath) {
        const records = await loadProjectRegistry(args.repositoryPath, args.registryPath, nodeFileSystem);
        validated.push(`${records.length} project registration${records.length === 1 ? "" : "s"} in ${args.registryPath}`);
      }
      process.stdout.write(`Valid: ${validated.join(" and ")}
`);
      return 0;
    }
    const changeScope = args.baseRef ? await loadGitChangeScope(args.repositoryPath, args.baseRef) : void 0;
    const snapshot = await loadRepositorySnapshot(
      args.repositoryPath,
      nodeFileSystem,
      changeScope?.files ?? [],
      changeScope
    );
    if (args.command === "analyze") {
      const architectureProfile2 = args.profilePath ? await loadArchitectureProfile(args.repositoryPath, args.profilePath, nodeFileSystem) : void 0;
      const result2 = await runRepositoryAnalysisCommand(
        snapshot,
        args.json,
        architectureProfile2,
        args.runTools ? nodeVerificationToolRunner : void 0
      );
      process.stdout.write(`${result2.output}
`);
      return result2.context.analysisStatus === "COMPLETE" ? 0 : 1;
    }
    let registration;
    if (args.registryPath) {
      const records = await loadProjectRegistry(args.repositoryPath, args.registryPath, nodeFileSystem);
      registration = selectProjectRegistration(records, args.projectId);
    }
    const packPath = args.packExplicit ? args.packPath : registration?.governance_pack ?? args.packPath;
    const governancePack = await loadGovernancePack(args.repositoryPath, packPath, nodeFileSystem);
    if (registration) assertPackMatchesRegistration(governancePack, registration);
    const architectureProfile = args.profilePath ? await loadArchitectureProfile(args.repositoryPath, args.profilePath, nodeFileSystem) : registration ? getRegisteredArchitectureProfile(registration.profiles.architecture) : void 0;
    const authorityPolicy = args.authorityPath ? await loadAuthorityPolicy(args.repositoryPath, args.authorityPath, nodeFileSystem) : void 0;
    const controlCatalog = args.catalogPath ? await loadControlCatalog(args.repositoryPath, args.catalogPath, nodeFileSystem) : void 0;
    const verifiedApprovals = args.verifySignatures && authorityPolicy ? (await verifyApprovals(governancePack, authorityPolicy, gpgSignaturePort, (file) => nodeFileSystem.readTextFile(args.repositoryPath, file))).filter((check) => check.verified).map((check) => check.id) : void 0;
    const result = await runGovernanceCommand({
      snapshot,
      governancePack,
      ...verifiedApprovals ? { verifiedApprovals } : {},
      ...controlCatalog ? { controlCatalog } : {},
      ...authorityPolicy ? { authorityPolicy } : {},
      ...registration ? { registration } : {},
      ...args.json || args.command === "report" && args.format === "json" ? { json: true } : {},
      ...args.command === "report" && args.format !== "json" ? { markdown: true } : {},
      ...architectureProfile ? { architectureProfile } : {},
      ...args.runTools ? { verificationRunner: nodeVerificationToolRunner } : {}
    });
    process.stdout.write(`${result.output}
`);
    if (args.record) {
      const packText = await nodeFileSystem.readTextFile(args.repositoryPath, packPath) ?? "";
      const head = await nodeGitCommandRunner.run(["rev-parse", "HEAD"], args.repositoryPath, 1e4).catch(() => void 0);
      const facts = assessmentFacts(governancePack, packText, result.evaluation, result.analysis.findings, head?.exitCode === 0 ? head.stdout.trim() : void 0, result.analysis.snapshotFingerprint?.digest);
      const saved = await recordAssessment(nodeHistoryStore, args.repositoryPath, facts);
      process.stdout.write(`Recorded assessment #${saved.seq} in .governance/history/assessments.jsonl
`);
    }
    if (args.write) {
      const written = await writeDatedReport(args.repositoryPath, "report", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), `${result.output}
`);
      process.stdout.write(`Wrote ${written}
`);
    }
    if (result.evaluation.decision.status === "NO-GO") return 2;
    if (result.evaluation.decision.status === "GO_WITH_CONDITIONS") return 1;
    return 0;
  } catch (error) {
    process.stderr.write(`Governance CLI error: ${error instanceof Error ? error.message : String(error)}
`);
    return 3;
  }
}
var entrypoint = process.argv[1] ? pathToFileURL(path11.resolve(process.argv[1])).href : void 0;
if (entrypoint === import.meta.url) {
  process.exitCode = await runCli(process.argv.slice(2));
}
export {
  formatAnalysisResult,
  formatHumanResult,
  formatJsonResult,
  loadArchitectureProfile,
  loadAuthorityPolicy,
  loadControlCatalog,
  loadGitChangeScope,
  loadGovernancePack,
  loadProjectRegistry,
  loadRepositorySnapshot,
  nodeFileSystem,
  nodeGitCommandRunner,
  parseCliArguments,
  runAnalyzeCommand,
  runCli,
  runGovernanceCommand,
  runRepositoryAnalysisCommand
};
