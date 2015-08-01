(function(root, factory) {
    if (typeof module !== "undefined" && module.exports) {
        module.exports = factory()
    } else {
        root.AudioManager = factory()
    }
})(this, function() {
    var requirejs, require, define;
    (function(undef) {
        var main, req, makeMap, handlers, defined = {},
            waiting = {},
            config = {},
            defining = {},
            hasOwn = Object.prototype.hasOwnProperty,
            aps = [].slice;

        function hasProp(obj, prop) {
            return hasOwn.call(obj, prop)
        }

        function normalize(name, baseName) {
            var nameParts, nameSegment, mapValue, foundMap, foundI, foundStarMap, starI, i, j, part, baseParts = baseName && baseName.split("/"),
                map = config.map,
                starMap = map && map["*"] || {};
            if (name && name.charAt(0) === ".") {
                if (baseName) {
                    baseParts = baseParts.slice(0, baseParts.length - 1);
                    name = baseParts.concat(name.split("/"));
                    for (i = 0; i < name.length; i += 1) {
                        part = name[i];
                        if (part === ".") {
                            name.splice(i, 1);
                            i -= 1
                        } else if (part === "..") {
                            if (i === 1 && (name[2] === ".." || name[0] === "..")) {
                                break
                            } else if (i > 0) {
                                name.splice(i - 1, 2);
                                i -= 2
                            }
                        }
                    }
                    name = name.join("/")
                } else if (name.indexOf("./") === 0) {
                    name = name.substring(2)
                }
            }
            if ((baseParts || starMap) && map) {
                nameParts = name.split("/");
                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join("/");
                    if (baseParts) {
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = map[baseParts.slice(0, j).join("/")];
                            if (mapValue) {
                                mapValue = mapValue[nameSegment];
                                if (mapValue) {
                                    foundMap = mapValue;
                                    foundI = i;
                                    break
                                }
                            }
                        }
                    }
                    if (foundMap) {
                        break
                    }
                    if (!foundStarMap && starMap && starMap[nameSegment]) {
                        foundStarMap = starMap[nameSegment];
                        starI = i
                    }
                }
                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI
                }
                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join("/")
                }
            }
            return name
        }

        function makeRequire(relName, forceSync) {
            return function() {
                return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]))
            }
        }

        function makeNormalize(relName) {
            return function(name) {
                return normalize(name, relName)
            }
        }

        function makeLoad(depName) {
            return function(value) {
                defined[depName] = value
            }
        }

        function callDep(name) {
            if (hasProp(waiting, name)) {
                var args = waiting[name];
                delete waiting[name];
                defining[name] = true;
                main.apply(undef, args)
            }
            if (!hasProp(defined, name) && !hasProp(defining, name)) {
                throw new Error("No " + name)
            }
            return defined[name]
        }

        function splitPrefix(name) {
            var prefix, index = name ? name.indexOf("!") : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length)
            }
            return [prefix, name]
        }
        makeMap = function(name, relName) {
            var plugin, parts = splitPrefix(name),
                prefix = parts[0];
            name = parts[1];
            if (prefix) {
                prefix = normalize(prefix, relName);
                plugin = callDep(prefix)
            }
            if (prefix) {
                if (plugin && plugin.normalize) {
                    name = plugin.normalize(name, makeNormalize(relName))
                } else {
                    name = normalize(name, relName)
                }
            } else {
                name = normalize(name, relName);
                parts = splitPrefix(name);
                prefix = parts[0];
                name = parts[1];
                if (prefix) {
                    plugin = callDep(prefix)
                }
            }
            return {
                f: prefix ? prefix + "!" + name : name,
                n: name,
                pr: prefix,
                p: plugin
            }
        };

        function makeConfig(name) {
            return function() {
                return config && config.config && config.config[name] || {}
            }
        }
        handlers = {
            require: function(name) {
                return makeRequire(name)
            },
            exports: function(name) {
                var e = defined[name];
                if (typeof e !== "undefined") {
                    return e
                } else {
                    return defined[name] = {}
                }
            },
            module: function(name) {
                return {
                    id: name,
                    uri: "",
                    exports: defined[name],
                    config: makeConfig(name)
                }
            }
        };
        main = function(name, deps, callback, relName) {
            var cjsModule, depName, ret, map, i, args = [],
                usingExports;
            relName = relName || name;
            if (typeof callback === "function") {
                deps = !deps.length && callback.length ? ["require", "exports", "module"] : deps;
                for (i = 0; i < deps.length; i += 1) {
                    map = makeMap(deps[i], relName);
                    depName = map.f;
                    if (depName === "require") {
                        args[i] = handlers.require(name)
                    } else if (depName === "exports") {
                        args[i] = handlers.exports(name);
                        usingExports = true
                    } else if (depName === "module") {
                        cjsModule = args[i] = handlers.module(name)
                    } else if (hasProp(defined, depName) || hasProp(waiting, depName) || hasProp(defining, depName)) {
                        args[i] = callDep(depName)
                    } else if (map.p) {
                        map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                        args[i] = defined[depName]
                    } else {
                        throw new Error(name + " missing " + depName)
                    }
                }
                ret = callback.apply(defined[name], args);
                if (name) {
                    if (cjsModule && cjsModule.exports !== undef && cjsModule.exports !== defined[name]) {
                        defined[name] = cjsModule.exports
                    } else if (ret !== undef || !usingExports) {
                        defined[name] = ret
                    }
                }
            } else if (name) {
                defined[name] = callback
            }
        };
        requirejs = require = req = function(deps, callback, relName, forceSync, alt) {
            if (typeof deps === "string") {
                if (handlers[deps]) {
                    return handlers[deps](callback)
                }
                return callDep(makeMap(deps, callback).f)
            } else if (!deps.splice) {
                config = deps;
                if (callback.splice) {
                    deps = callback;
                    callback = relName;
                    relName = null
                } else {
                    deps = undef
                }
            }
            callback = callback || function() {};
            if (typeof relName === "function") {
                relName = forceSync;
                forceSync = alt
            }
            if (forceSync) {
                main(undef, deps, callback, relName)
            } else {
                setTimeout(function() {
                    main(undef, deps, callback, relName)
                }, 4)
            }
            return req
        };
        req.config = function(cfg) {
            config = cfg;
            if (config.deps) {
                req(config.deps, config.callback)
            }
            return req
        };
        define = function(name, deps, callback) {
            if (!deps.splice) {
                callback = deps;
                deps = []
            }
            if (!hasProp(defined, name) && !hasProp(waiting, name)) {
                waiting[name] = [name, deps, callback]
            }
        };
        define.amd = {
            jQuery: true
        }
    })();
    define("vendor/almond", function() {});
    ! function(n) {
        function t(n) {
            return typeof n.toString != "function" && typeof(n + "") == "string"
        }

        function r() {}

        function e(n) {
            n.length = 0, v.length < O && v.push(n)
        }

        function o(n) {
            var t = n.k;
            t && o(t), n.b = n.k = n.object = n.number = n.string = null, d.length < O && d.push(n)
        }

        function u() {}

        function a(n, t, r) {
            function e() {
                var f = arguments,
                    l = u ? this : t;
                return o || (n = t[a]), r.length && (f = f.length ? (f = W.call(f), c ? f.concat(r) : r.concat(f)) : r), this instanceof e ? (l = i(n.prototype), f = n.apply(l, f), g(f) ? f : l) : n.apply(l, f)
            }
            var o = p(n),
                u = !r,
                a = t;
            if (u) {
                var c = void 0;
                r = t
            } else if (!o) throw new TypeError;
            return e
        }

        function c() {
            var n = d.pop() || {
                a: "",
                b: null,
                c: "",
                k: null,
                "false": !1,
                d: "",
                e: "",
                f: "",
                "null": !1,
                number: null,
                object: null,
                push: null,
                g: null,
                string: null,
                h: "",
                "true": !1,
                undefined: !1,
                i: !1,
                j: !1
            };
            n.g = w, n.b = n.c = n.f = n.h = "", n.e = "r", n.i = !0, n.j = !!et;
            for (var t, r = 0; t = arguments[r]; r++)
                for (var e in t) n[e] = t[e];
            r = n.a, n.d = /^[^,]+/.exec(r)[0], t = Function, r = "return function(" + r + "){", e = "var m,r=" + n.d + ",C=" + n.e + ";if(!r)return C;" + n.h + ";", n.b ? (e += "var s=r.length;m=-1;if(" + n.b + "){", Z.unindexedChars && (e += "if(q(r)){r=r.split('')}"), e += "while(++m<s){" + n.f + ";}}else{") : Z.nonEnumArgs && (e += "var s=r.length;m=-1;if(s&&n(r)){while(++m<s){m+='';" + n.f + ";}}else{"), Z.enumPrototypes && (e += "var E=typeof r=='function';"), Z.enumErrorProps && (e += "var D=r===j||r instanceof Error;");
            var a = [];
            if (Z.enumPrototypes && a.push('!(E&&m=="prototype")'), Z.enumErrorProps && a.push('!(D&&(m=="message"||m=="name"))'), n.i && n.j) e += "var A=-1,B=z[typeof r]&&t(r),s=B?B.length:0;while(++A<s){m=B[A];", a.length && (e += "if(" + a.join("&&") + "){"), e += n.f + ";", a.length && (e += "}"), e += "}";
            else if (e += "for(m in r){", n.i && a.push("l.call(r, m)"), a.length && (e += "if(" + a.join("&&") + "){"), e += n.f + ";", a.length && (e += "}"), e += "}", Z.nonEnumShadows) {
                for (e += "if(r!==y){var h=r.constructor,p=r===(h&&h.prototype),e=r===H?G:r===j?i:J.call(r),v=w[e];", k = 0; 7 > k; k++) e += "m='" + n.g[k] + "';if((!(p&&v[m])&&l.call(r,m))", n.i || (e += "||(!v[m]&&r[m]!==y[m])"), e += "){" + n.f + "}";
                e += "}"
            }
            return (n.b || Z.nonEnumArgs) && (e += "}"), e += n.c + ";return C", t = t("i,j,l,n,o,q,t,u,y,z,w,G,H,J", r + e + "}"), o(n), t(P, $, L, f, tt, h, et, u, N, q, Y, z, G, T)
        }

        function i(n) {
            return g(n) ? K(n) : {}
        }

        function f(n) {
            return T.call(n) == A
        }

        function l(n) {
            var t = [];
            return ut(n, function(n, r) {
                p(n) && t.push(r)
            }), t.sort()
        }

        function s(n, r, o, a, c, i) {
            var l = o === E;
            if (typeof o == "function" && !l) {
                o = u.createCallback(o, a, 2);
                var g = o(n, r);
                if (typeof g != "undefined") return !!g
            }
            if (n === r) return 0 !== n || 1 / n == 1 / r;
            var h = typeof n,
                m = typeof r;
            if (n === n && (!n || "function" != h && "object" != h) && (!r || "function" != m && "object" != m)) return !1;
            if (null == n || null == r) return n === r;
            if (m = T.call(n), h = T.call(r), m == A && (m = B), h == A && (h = B), m != h) return !1;
            switch (m) {
                case S:
                case x:
                    return +n == +r;
                case I:
                    return n != +n ? r != +r : 0 == n ? 1 / n == 1 / r : n == +r;
                case F:
                case z:
                    return n == r + ""
            }
            if (h = m == _, !h) {
                if (L.call(n, "__wrapped__") || L.call(r, "__wrapped__")) return s(n.__wrapped__ || n, r.__wrapped__ || r, o, a, c, i);
                if (m != B || !Z.nodeClass && (t(n) || t(r))) return !1;
                var m = !Z.argsObject && f(n) ? Object : n.constructor,
                    y = !Z.argsObject && f(r) ? Object : r.constructor;
                if (m != y && !(p(m) && m instanceof m && p(y) && y instanceof y)) return !1
            }
            for (y = !c, c || (c = v.pop() || []), i || (i = v.pop() || []), m = c.length; m--;)
                if (c[m] == n) return i[m] == r;
            var b = 0,
                g = !0;
            if (c.push(n), i.push(r), h) {
                if (m = n.length, b = r.length, g = b == n.length, !g && !l) return g;
                for (; b--;)
                    if (h = m, y = r[b], l)
                        for (; h-- && !(g = s(n[h], y, o, a, c, i)););
                    else if (!(g = s(n[b], y, o, a, c, i))) break;
                return g
            }
            return ut(r, function(t, r, e) {
                return L.call(e, r) ? (b++, g = L.call(n, r) && s(n[r], t, o, a, c, i)) : void 0
            }), g && !l && ut(n, function(n, t, r) {
                return L.call(r, t) ? g = -1 < --b : void 0
            }), y && (e(c), e(i)), g
        }

        function p(n) {
            return typeof n == "function"
        }

        function g(n) {
            return !(!n || !q[typeof n])
        }

        function h(n) {
            return typeof n == "string" || T.call(n) == z
        }

        function m(n, t, r) {
            if (t && typeof r == "undefined" && tt(n)) {
                r = -1;
                for (var e = n.length; ++r < e && false !== t(n[r], r, n););
            } else ot(n, t, r);
            return n
        }

        function y(n, t) {
            return Z.fastBind || V && 2 < arguments.length ? V.call.apply(V, arguments) : a(n, t, W.call(arguments, 2))
        }

        function b(n) {
            return n
        }
        var v = [],
            d = [],
            j = 0,
            E = {},
            O = 40,
            C = (C = /\bthis\b/) && C.test(function() {
                return this
            }) && C,
            w = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),
            A = "[object Arguments]",
            _ = "[object Array]",
            S = "[object Boolean]",
            x = "[object Date]",
            P = "[object Error]",
            I = "[object Number]",
            B = "[object Object]",
            F = "[object RegExp]",
            z = "[object String]",
            q = {
                "boolean": !1,
                "function": !0,
                object: !0,
                number: !1,
                string: !1,
                undefined: !1
            },
            D = q[typeof global] && global;
        !D || D.global !== D && D.window !== D || (n = D);
        var R = [],
            $ = Error.prototype,
            N = Object.prototype,
            G = String.prototype,
            D = RegExp("^" + (N.valueOf + "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/valueOf|for [^\]]+/g, ".+?") + "$"),
            H = R.concat,
            J = Function.prototype.toString,
            L = N.hasOwnProperty,
            M = N.propertyIsEnumerable,
            T = N.toString,
            V = D.test(V = T.bind) && V,
            K = D.test(K = Object.create) && K,
            Q = D.test(Q = Array.isArray) && Q,
            U = D.test(U = Object.keys) && U,
            W = R.slice;
        n = D.test(n.attachEvent);
        var X = V && !/\n|true/.test(V + n),
            Y = {};
        Y[_] = Y[x] = Y[I] = {
                constructor: !0,
                toLocaleString: !0,
                toString: !0,
                valueOf: !0
            }, Y[S] = Y[z] = {
                constructor: !0,
                toString: !0,
                valueOf: !0
            }, Y[P] = Y["[object Function]"] = Y[F] = {
                constructor: !0,
                toString: !0
            }, Y[B] = {
                constructor: !0
            },
            function() {
                for (var n = w.length; n--;) {
                    var t, r = w[n];
                    for (t in Y) L.call(Y, t) && !L.call(Y[t], r) && (Y[t][r] = !1)
                }
            }();
        var Z = u.support = {};
        ! function() {
            function n() {
                this.x = 1
            }
            var t = [];
            n.prototype = {
                valueOf: 1
            };
            for (var r in new n) t.push(r);
            for (r in arguments);
            Z.argsObject = arguments.constructor == Object && !(arguments instanceof Array), Z.argsClass = f(arguments), Z.enumErrorProps = M.call($, "message") || M.call($, "name"), Z.enumPrototypes = M.call(n, "prototype"), Z.fastBind = V && !X, Z.nonEnumArgs = 0 != r, Z.nonEnumShadows = !/valueOf/.test(t), Z.unindexedChars = "xx" != "x" [0] + Object("x")[0];
            try {
                Z.nodeClass = !(T.call(document) == B && !({
                    toString: 0
                } + ""))
            } catch (e) {
                Z.nodeClass = !0
            }
        }(1);
        var nt = {
            a: "x,F,k",
            h: "var a=arguments,b=0,c=typeof k=='number'?2:a.length;while(++b<c){r=a[b];if(r&&z[typeof r]){",
            f: "if(typeof C[m]=='undefined')C[m]=r[m]",
            c: "}}"
        };
        n = {
            a: "f,d,I",
            h: "d=d&&typeof I=='undefined'?d:u.createCallback(d,I)",
            b: "typeof s=='number'",
            f: "if(d(r[m],m,f)===false)return C"
        }, D = {
            h: "if(!z[typeof r])return C;" + n.h,
            b: !1
        }, K || (i = function(n) {
            if (g(n)) {
                r.prototype = n;
                var t = new r;
                r.prototype = null
            }
            return t || {}
        }), Z.argsClass || (f = function(n) {
            return n ? L.call(n, "callee") : !1
        });
        var tt = Q || function(n) {
                return n ? typeof n == "object" && T.call(n) == _ : !1
            },
            rt = c({
                a: "x",
                e: "[]",
                h: "if(!(z[typeof x]))return C",
                f: "C.push(m)"
            }),
            et = U ? function(n) {
                return g(n) ? Z.enumPrototypes && typeof n == "function" || Z.nonEnumArgs && n.length && f(n) ? rt(n) : U(n) : []
            } : rt,
            ot = c(n),
            Q = c(nt, {
                h: nt.h.replace(";", ";if(c>3&&typeof a[c-2]=='function'){var d=u.createCallback(a[--c-1],a[c--],2)}else if(c>2&&typeof a[c-1]=='function'){d=a[--c]}"),
                f: "C[m]=d?d(C[m],r[m]):r[m]"
            }),
            nt = c(nt),
            ut = c(n, D, {
                i: !1
            });
        p(/x/) && (p = function(n) {
            return typeof n == "function" && "[object Function]" == T.call(n)
        }), u.assign = Q, u.bind = y, u.bindAll = function(n) {
            for (var t = 1 < arguments.length ? H.apply(R, W.call(arguments, 1)) : l(n), r = -1, e = t.length; ++r < e;) {
                var o = t[r];
                n[o] = y(n[o], n)
            }
            return n
        }, u.createCallback = function(n, t, r) {
            if (null == n) return b;
            var e = typeof n;
            if ("function" != e) {
                if ("object" != e) return function(t) {
                    return t[n]
                };
                var o = et(n);
                return function(t) {
                    for (var r = o.length, e = !1; r-- && (e = s(t[o[r]], n[o[r]], E)););
                    return e
                }
            }
            return typeof t == "undefined" || C && !C.test(J.call(n)) ? n : 1 === r ? function(r) {
                return n.call(t, r)
            } : 2 === r ? function(r, e) {
                return n.call(t, r, e)
            } : 4 === r ? function(r, e, o, u) {
                return n.call(t, r, e, o, u)
            } : function(r, e, o) {
                return n.call(t, r, e, o)
            }
        }, u.defaults = nt, u.forEach = m, u.forIn = ut, u.functions = l, u.invoke = function(n, t) {
            var r = W.call(arguments, 2),
                e = -1,
                o = typeof t == "function",
                u = n ? n.length : 0,
                a = Array(typeof u == "number" ? u : 0);
            return m(n, function(n) {
                a[++e] = (o ? t : n[t]).apply(n, r)
            }), a
        }, u.keys = et, u.once = function(n) {
            var t, r;
            return function() {
                return t ? r : (t = !0, r = n.apply(this, arguments), n = null, r)
            }
        }, u.values = function(n) {
            for (var t = -1, r = et(n), e = r.length, o = Array(e); ++t < e;) o[t] = n[r[t]];
            return o
        }, u.each = m, u.extend = Q, u.methods = l, u.identity = b, u.isArguments = f, u.isArray = tt, u.isEqual = s, u.isFunction = p, u.isObject = g, u.isString = h, u.uniqueId = function(n) {
            var t = ++j;
            return (null == n ? "" : n) + "" + t
        }, u.VERSION = "1.3.1", typeof define == "function" && typeof define.amd == "object" && define.amd && define("underscore", [], function() {
            return u
        })
    }(this);
    define("browserutils", {
        supportHTML5Audio: function() {
            var testAudio;
            try {
                if (window.HTMLAudioElement && typeof Audio !== "undefined") {
                    testAudio = new Audio;
                    return true
                }
            } catch (e) {
                return false
            }
        },
        supportSourceSwappingWithPreload: function() {
            return /Firefox/i.test(navigator.userAgent)
        },
        isMobile: function(type) {
            var uA = window.navigator.userAgent,
                devices = ["mobile", "iPhone", "iPad", "iPod", "Android", "Skyfire"];
            return devices.some(function(device) {
                device = new RegExp(device, "i");
                return device.test(uA)
            })
        },
        canPlayType: function(type) {
            var audio = document.createElement("audio");
            if (!audio || !audio.canPlayType) {
                return false
            } else {
                return audio.canPlayType(type).match(/maybe|probably/i) ? true : false
            }
        },
        isNativeHlsSupported: function() {
            var ua = navigator.userAgent,
                devices = ["iPhone", "iPad", "iPod"],
                check, desktopSafari, iOS;
            check = function(r) {
                return r.test(ua)
            };
            desktopSafari = !check(/chrome/i) && !check(/opera/i) && check(/safari/i);
            iOS = devices.some(function(device) {
                return check(new RegExp(device, "i"))
            });
            return iOS || desktopSafari
        }
    });
    define("errors", {
        FLASH_HLS_PLAYLIST_NOT_FOUND: "HLS_PLAYLIST_NOT_FOUND",
        FLASH_HLS_PLAYLIST_SECURITY_ERROR: "HLS_SECURITY_ERROR",
        FLASH_HLS_NOT_VALID_PLAYLIST: "HLS_NOT_VALID_PLAYLIST",
        FLASH_HLS_NO_TS_IN_PLAYLIST: "HLS_NO_TS_IN_PLAYLIST",
        FLASH_HLS_NO_PLAYLIST_IN_MANIFEST: "HLS_NO_PLAYLIST_IN_MANIFEST",
        FLASH_HLS_TS_IS_CORRUPT: "HLS_TS_IS_CORRUPT",
        FLASH_HLS_FLV_TAG_CORRUPT: "HLS_FLV_TAG_CORRUPT",
        FLASH_HTTP_FILE_NOT_FOUND: "HTTP_FILE_NOT_FOUND",
        FLASH_RTMP_CONNECT_FAILED: "RTMP_CONNECT_FAILED",
        FLASH_RTMP_CONNECT_CLOSED: "RTMP_CONNECT_CLOSED",
        FLASH_RTMP_CANNOT_PLAY_STREAM: "RTMP_CANNOT_PLAY_STREAM",
        FLASH_PROXY_CANT_LOAD_FLASH: "CANT_LOAD_FLASH",
        FLASH_PROXY_FLASH_BLOCKED: "FLASH_PROXY_FLASH_BLOCKED",
        HTML5_AUDIO_ABORTED: "HTML5_AUDIO_ABORTED",
        HTML5_AUDIO_NETWORK: "HTML5_AUDIO_NETWORK",
        HTML5_AUDIO_DECODE: "HTML5_AUDIO_DECODE",
        HTML5_AUDIO_SRC_NOT_SUPPORTED: "HTML5_AUDIO_SRC_NOT_SUPPORTED"
    });
    define("vendor/events", ["require", "exports", "module", "underscore"], function(require, exports, module) {
        var _ = require("underscore");
        var array = [];
        var push = array.push;
        var slice = array.slice;
        var splice = array.splice;
        var eventSplitter = /\s+/;
        var eventsApi = function(obj, action, name, rest) {
            if (!name) return true;
            if (typeof name === "object") {
                for (var key in name) {
                    obj[action].apply(obj, [key, name[key]].concat(rest))
                }
            } else if (eventSplitter.test(name)) {
                var names = name.split(eventSplitter);
                for (var i = 0, l = names.length; i < l; i++) {
                    obj[action].apply(obj, [names[i]].concat(rest))
                }
            } else {
                return true
            }
        };
        var triggerEvents = function(events, args) {
            var ev, i = -1,
                l = events.length;
            switch (args.length) {
                case 0:
                    while (++i < l) {
                        ev = events[i];
                        ev.callback.call(ev.ctx)
                    }
                    return;
                case 1:
                    while (++i < l)(ev = events[i]).callback.call(ev.ctx, args[0]);
                    return;
                case 2:
                    while (++i < l)(ev = events[i]).callback.call(ev.ctx, args[0], args[1]);
                    return;
                case 3:
                    while (++i < l)(ev = events[i]).callback.call(ev.ctx, args[0], args[1], args[2]);
                    return;
                default:
                    while (++i < l)(ev = events[i]).callback.apply(ev.ctx, args)
            }
        };
        var Events = {
            on: function(name, callback, context) {
                if (!eventsApi(this, "on", name, [callback, context]) || !callback) return this;
                this._events || (this._events = {});
                var events = this._events[name] || (this._events[name] = []);
                events.push({
                    callback: callback,
                    context: context,
                    ctx: context || this
                });
                return this
            },
            once: function(name, callback, context) {
                if (!eventsApi(this, "once", name, [callback, context]) || !callback) return this;
                var self = this;
                var once = _.once(function() {
                    self.off(name, once);
                    callback.apply(this, arguments)
                });
                once._callback = callback;
                return this.on(name, once, context)
            },
            off: function(name, callback, context) {
                var retain, ev, events, names, i, l, j, k;
                if (!this._events || !eventsApi(this, "off", name, [callback, context])) return this;
                if (!name && !callback && !context) {
                    this._events = {};
                    return this
                }
                names = name ? [name] : _.keys(this._events);
                for (i = 0, l = names.length; i < l; i++) {
                    name = names[i];
                    if (events = this._events[name]) {
                        this._events[name] = retain = [];
                        if (callback || context) {
                            for (j = 0, k = events.length; j < k; j++) {
                                ev = events[j];
                                if (callback && callback !== ev.callback && callback !== ev.callback._callback || context && context !== ev.context) {
                                    retain.push(ev)
                                }
                            }
                        }
                        if (!retain.length) delete this._events[name]
                    }
                }
                return this
            },
            trigger: function(name, args) {
                if (!this._events) return this;
                var args = slice.call(arguments, 1);
                if (!eventsApi(this, "trigger", name, args)) return this;
                var events = this._events[name];
                var allEvents = this._events.all;
                if (events) triggerEvents(events, args);
                if (allEvents) triggerEvents(allEvents, arguments);
                return this
            },
            stopListening: function(obj, name, callback) {
                var listeners = this._listeners;
                if (!listeners) return this;
                var deleteListener = !name && !callback;
                if (typeof name === "object") callback = this;
                if (obj)(listeners = {})[obj._listenerId] = obj;
                for (var id in listeners) {
                    listeners[id].off(name, callback, this);
                    if (deleteListener) delete this._listeners[id]
                }
                return this
            }
        };
        var listenMethods = {
            listenTo: "on",
            listenToOnce: "once"
        };
        _.each(listenMethods, function(implementation, method) {
            Events[method] = function(obj, name, callback) {
                var listeners = this._listeners || (this._listeners = {});
                var id = obj._listenerId || (obj._listenerId = _.uniqueId("l"));
                listeners[id] = obj;
                if (typeof name === "object") callback = this;
                obj[implementation](name, callback, this);
                return this
            }
        });
        Events.bind = Events.on;
        Events.unbind = Events.off;
        module.exports = Events
    });
    define("logger", ["require", "exports", "module"], function(require, exports, module) {
        var Logger;
        module.exports = Logger = function(type, id, settings) {
            this.enabled = settings.debug;
            this.type = type;
            this.id = id
        };
        Logger.prototype.log = function(message) {
            if (!this.enabled) {
                return
            }
            window.console.log("#" + this.type + " " + this.id + "# " + message)
        }
    });
    define("states", {
        PLAYING: "playing",
        LOADING: "loading",
        SEEKING: "seeking",
        PAUSED: "paused",
        ERROR: "error",
        IDLE: "idle",
        INITIALIZE: "initialize",
        ENDED: "ended",
        DEAD: "dead"
    });
    define("vendor/swfobject", [], function() {
        var UNDEF = "undefined",
            OBJECT = "object",
            SHOCKWAVE_FLASH = "Shockwave Flash",
            SHOCKWAVE_FLASH_AX = "ShockwaveFlash.ShockwaveFlash",
            FLASH_MIME_TYPE = "application/x-shockwave-flash",
            EXPRESS_INSTALL_ID = "SWFObjectExprInst",
            ON_READY_STATE_CHANGE = "onreadystatechange",
            win = window,
            doc = document,
            nav = navigator,
            swfobject, plugin = false,
            domLoadFnArr = [],
            regObjArr = [],
            objIdArr = [],
            listenersArr = [],
            storedFbContent, storedFbContentId, storedCallbackFn, storedCallbackObj, isDomLoaded = false,
            isExpressInstallActive = false,
            dynamicStylesheet, dynamicStylesheetMedia, autoHideShow = true,
            encodeURI_enabled = false,
            ua = function() {
                var w3cdom = typeof doc.getElementById != UNDEF && typeof doc.getElementsByTagName != UNDEF && typeof doc.createElement != UNDEF,
                    u = nav.userAgent.toLowerCase(),
                    p = nav.platform.toLowerCase(),
                    windows = p ? /win/.test(p) : /win/.test(u),
                    mac = p ? /mac/.test(p) : /mac/.test(u),
                    webkit = /webkit/.test(u) ? parseFloat(u.replace(/^.*webkit\/(\d+(\.\d+)?).*$/, "$1")) : false,
                    ie = nav.appName === "Microsoft Internet Explorer",
                    playerVersion = [0, 0, 0],
                    d = null;
                if (typeof nav.plugins != UNDEF && typeof nav.plugins[SHOCKWAVE_FLASH] == OBJECT) {
                    d = nav.plugins[SHOCKWAVE_FLASH].description;
                    if (d && (typeof nav.mimeTypes != UNDEF && nav.mimeTypes[FLASH_MIME_TYPE] && nav.mimeTypes[FLASH_MIME_TYPE].enabledPlugin)) {
                        plugin = true;
                        ie = false;
                        d = d.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
                        playerVersion[0] = toInt(d.replace(/^(.*)\..*$/, "$1"));
                        playerVersion[1] = toInt(d.replace(/^.*\.(.*)\s.*$/, "$1"));
                        playerVersion[2] = /[a-zA-Z]/.test(d) ? toInt(d.replace(/^.*[a-zA-Z]+(.*)$/, "$1")) : 0
                    }
                } else if (typeof win.ActiveXObject != UNDEF) {
                    try {
                        var a = new ActiveXObject(SHOCKWAVE_FLASH_AX);
                        if (a) {
                            d = a.GetVariable("$version");
                            if (d) {
                                ie = true;
                                d = d.split(" ")[1].split(",");
                                playerVersion = [toInt(d[0]), toInt(d[1]), toInt(d[2])]
                            }
                        }
                    } catch (e) {}
                }
                return {
                    w3: w3cdom,
                    pv: playerVersion,
                    wk: webkit,
                    ie: ie,
                    win: windows,
                    mac: mac
                }
            }(),
            onDomLoad = function() {
                if (!ua.w3) {
                    return
                }
                if (typeof doc.readyState != UNDEF && (doc.readyState === "complete" || doc.readyState === "interactive") || typeof doc.readyState == UNDEF && (doc.getElementsByTagName("body")[0] || doc.body)) {
                    callDomLoadFunctions()
                }
                if (!isDomLoaded) {
                    if (typeof doc.addEventListener != UNDEF) {
                        doc.addEventListener("DOMContentLoaded", callDomLoadFunctions, false)
                    }
                    if (ua.ie) {
                        doc.attachEvent(ON_READY_STATE_CHANGE, function detach() {
                            if (doc.readyState == "complete") {
                                doc.detachEvent(ON_READY_STATE_CHANGE, detach);
                                callDomLoadFunctions()
                            }
                        });
                        if (win == top) {
                            (function checkDomLoadedIE() {
                                if (isDomLoaded) {
                                    return
                                }
                                try {
                                    doc.documentElement.doScroll("left")
                                } catch (e) {
                                    setTimeout(checkDomLoadedIE, 0);
                                    return
                                }
                                callDomLoadFunctions()
                            })()
                        }
                    }
                    if (ua.wk) {
                        (function checkDomLoadedWK() {
                            if (isDomLoaded) {
                                return
                            }
                            if (!/loaded|complete/.test(doc.readyState)) {
                                setTimeout(checkDomLoadedWK, 0);
                                return
                            }
                            callDomLoadFunctions()
                        })()
                    }
                }
            }();

        function callDomLoadFunctions() {
            if (isDomLoaded || !document.getElementsByTagName("body")[0]) {
                return
            }
            try {
                var t, span = createElement("span");
                span.style.display = "none";
                t = doc.getElementsByTagName("body")[0].appendChild(span);
                t.parentNode.removeChild(t);
                t = null;
                span = null
            } catch (e) {
                return
            }
            isDomLoaded = true;
            var dl = domLoadFnArr.length;
            for (var i = 0; i < dl; i++) {
                domLoadFnArr[i]()
            }
        }

        function addDomLoadEvent(fn) {
            if (isDomLoaded) {
                fn()
            } else {
                domLoadFnArr[domLoadFnArr.length] = fn
            }
        }

        function addLoadEvent(fn) {
            if (typeof win.addEventListener != UNDEF) {
                win.addEventListener("load", fn, false)
            } else if (typeof doc.addEventListener != UNDEF) {
                doc.addEventListener("load", fn, false)
            } else if (typeof win.attachEvent != UNDEF) {
                addListener(win, "onload", fn)
            } else if (typeof win.onload == "function") {
                var fnOld = win.onload;
                win.onload = function() {
                    fnOld();
                    fn()
                }
            } else {
                win.onload = fn
            }
        }

        function testPlayerVersion() {
            var b = doc.getElementsByTagName("body")[0];
            var o = createElement(OBJECT);
            o.setAttribute("style", "visibility: hidden;");
            o.setAttribute("type", FLASH_MIME_TYPE);
            var t = b.appendChild(o);
            if (t) {
                var counter = 0;
                (function checkGetVariable() {
                    if (typeof t.GetVariable != UNDEF) {
                        try {
                            var d = t.GetVariable("$version");
                            if (d) {
                                d = d.split(" ")[1].split(",");
                                ua.pv = [toInt(d[0]), toInt(d[1]), toInt(d[2])]
                            }
                        } catch (e) {
                            ua.pv = [8, 0, 0]
                        }
                    } else if (counter < 10) {
                        counter++;
                        setTimeout(checkGetVariable, 10);
                        return
                    }
                    b.removeChild(o);
                    t = null;
                    matchVersions()
                })()
            } else {
                matchVersions()
            }
        }

        function matchVersions() {
            var rl = regObjArr.length;
            if (rl > 0) {
                for (var i = 0; i < rl; i++) {
                    var id = regObjArr[i].id;
                    var cb = regObjArr[i].callbackFn;
                    var cbObj = {
                        success: false,
                        id: id
                    };
                    if (ua.pv[0] > 0) {
                        var obj = getElementById(id);
                        if (obj) {
                            if (hasPlayerVersion(regObjArr[i].swfVersion) && !(ua.wk && ua.wk < 312)) {
                                setVisibility(id, true);
                                if (cb) {
                                    cbObj.success = true;
                                    cbObj.ref = getObjectById(id);
                                    cbObj.id = id;
                                    cb(cbObj)
                                }
                            } else if (regObjArr[i].expressInstall && canExpressInstall()) {
                                var att = {};
                                att.data = regObjArr[i].expressInstall;
                                att.width = obj.getAttribute("width") || "0";
                                att.height = obj.getAttribute("height") || "0";
                                if (obj.getAttribute("class")) {
                                    att.styleclass = obj.getAttribute("class")
                                }
                                if (obj.getAttribute("align")) {
                                    att.align = obj.getAttribute("align")
                                }
                                var par = {};
                                var p = obj.getElementsByTagName("param");
                                var pl = p.length;
                                for (var j = 0; j < pl; j++) {
                                    if (p[j].getAttribute("name").toLowerCase() != "movie") {
                                        par[p[j].getAttribute("name")] = p[j].getAttribute("value")
                                    }
                                }
                                showExpressInstall(att, par, id, cb)
                            } else {
                                displayFbContent(obj);
                                if (cb) {
                                    cb(cbObj)
                                }
                            }
                        }
                    } else {
                        setVisibility(id, true);
                        if (cb) {
                            var o = getObjectById(id);
                            if (o && typeof o.SetVariable != UNDEF) {
                                cbObj.success = true;
                                cbObj.ref = o;
                                cbObj.id = o.id
                            }
                            cb(cbObj)
                        }
                    }
                }
            }
        }
        domLoadFnArr[0] = function() {
            if (plugin) {
                testPlayerVersion()
            } else {
                matchVersions()
            }
        };

        function getObjectById(objectIdStr) {
            var r = null,
                o = getElementById(objectIdStr);
            if (o && o.nodeName.toUpperCase() === "OBJECT") {
                if (typeof o.SetVariable !== UNDEF) {
                    r = o
                } else {
                    r = o.getElementsByTagName(OBJECT)[0] || o
                }
            }
            return r
        }

        function canExpressInstall() {
            return !isExpressInstallActive && hasPlayerVersion("6.0.65") && (ua.win || ua.mac) && !(ua.wk && ua.wk < 312)
        }

        function showExpressInstall(att, par, replaceElemIdStr, callbackFn) {
            var obj = getElementById(replaceElemIdStr);
            replaceElemIdStr = getId(replaceElemIdStr);
            isExpressInstallActive = true;
            storedCallbackFn = callbackFn || null;
            storedCallbackObj = {
                success: false,
                id: replaceElemIdStr
            };
            if (obj) {
                if (obj.nodeName.toUpperCase() == "OBJECT") {
                    storedFbContent = abstractFbContent(obj);
                    storedFbContentId = null
                } else {
                    storedFbContent = obj;
                    storedFbContentId = replaceElemIdStr
                }
                att.id = EXPRESS_INSTALL_ID;
                if (typeof att.width == UNDEF || !/%$/.test(att.width) && toInt(att.width) < 310) {
                    att.width = "310"
                }
                if (typeof att.height == UNDEF || !/%$/.test(att.height) && toInt(att.height) < 137) {
                    att.height = "137"
                }
                var pt = ua.ie ? "ActiveX" : "PlugIn",
                    fv = "MMredirectURL=" + encodeURIComponent(win.location.toString().replace(/&/g, "%26")) + "&MMplayerType=" + pt + "&MMdoctitle=" + encodeURIComponent(doc.title.slice(0, 47) + " - Flash Player Installation");
                if (typeof par.flashvars != UNDEF) {
                    par.flashvars += "&" + fv
                } else {
                    par.flashvars = fv
                }
                if (ua.ie && obj.readyState != 4) {
                    var newObj = createElement("div");
                    replaceElemIdStr += "SWFObjectNew";
                    newObj.setAttribute("id", replaceElemIdStr);
                    obj.parentNode.insertBefore(newObj, obj);
                    obj.style.display = "none";
                    removeSWF(obj)
                }
                createSWF(att, par, replaceElemIdStr)
            }
        }

        function displayFbContent(obj) {
            if (ua.ie && obj.readyState != 4) {
                obj.style.display = "none";
                var el = createElement("div");
                obj.parentNode.insertBefore(el, obj);
                el.parentNode.replaceChild(abstractFbContent(obj), el);
                removeSWF(obj)
            } else {
                obj.parentNode.replaceChild(abstractFbContent(obj), obj)
            }
        }

        function abstractFbContent(obj) {
            var ac = createElement("div");
            if (ua.win && ua.ie) {
                ac.innerHTML = obj.innerHTML
            } else {
                var nestedObj = obj.getElementsByTagName(OBJECT)[0];
                if (nestedObj) {
                    var c = nestedObj.childNodes;
                    if (c) {
                        var cl = c.length;
                        for (var i = 0; i < cl; i++) {
                            if (!(c[i].nodeType == 1 && c[i].nodeName == "PARAM") && !(c[i].nodeType == 8)) {
                                ac.appendChild(c[i].cloneNode(true))
                            }
                        }
                    }
                }
            }
            return ac
        }

        function createIeObject(url, param_str) {
            var div = createElement("div");
            div.innerHTML = "<object classid='clsid:D27CDB6E-AE6D-11cf-96B8-444553540000'><param name='movie' value='" + url + "'>" + param_str + "</object>";
            return div.firstChild
        }

        function createSWF(attObj, parObj, id) {
            var r, el = getElementById(id);
            id = getId(id);
            if (ua.wk && ua.wk < 312) {
                return r
            }
            if (el) {
                var o = ua.ie ? createElement("div") : createElement(OBJECT),
                    attr, attr_lower, param;
                if (typeof attObj.id == UNDEF) {
                    attObj.id = id
                }
                for (param in parObj) {
                    if (parObj.hasOwnProperty(param) && param.toLowerCase() !== "movie") {
                        createObjParam(o, param, parObj[param])
                    }
                }
                if (ua.ie) {
                    o = createIeObject(attObj.data, o.innerHTML)
                }
                for (attr in attObj) {
                    if (attObj.hasOwnProperty(attr)) {
                        attr_lower = attr.toLowerCase();
                        if (attr_lower === "styleclass") {
                            o.setAttribute("class", attObj[attr])
                        } else if (attr_lower !== "classid" && attr_lower !== "data") {
                            o.setAttribute(attr, attObj[attr])
                        }
                    }
                }
                if (ua.ie) {
                    objIdArr[objIdArr.length] = attObj.id
                } else {
                    o.setAttribute("type", FLASH_MIME_TYPE);
                    o.setAttribute("data", attObj.data)
                }
                el.parentNode.replaceChild(o, el);
                r = o
            }
            return r
        }

        function createObjParam(el, pName, pValue) {
            var p = createElement("param");
            p.setAttribute("name", pName);
            p.setAttribute("value", pValue);
            el.appendChild(p)
        }

        function removeSWF(id) {
            var obj = getElementById(id);
            if (obj && obj.nodeName.toUpperCase() == "OBJECT") {
                if (ua.ie) {
                    obj.style.display = "none";
                    (function removeSWFInIE() {
                        if (obj.readyState == 4) {
                            for (var i in obj) {
                                if (typeof obj[i] == "function") {
                                    obj[i] = null
                                }
                            }
                            obj.parentNode.removeChild(obj)
                        } else {
                            setTimeout(removeSWFInIE, 10)
                        }
                    })()
                } else {
                    obj.parentNode.removeChild(obj)
                }
            }
        }

        function isElement(id) {
            return id && id.nodeType && id.nodeType === 1
        }

        function getId(thing) {
            return isElement(thing) ? thing.id : thing
        }

        function getElementById(id) {
            if (isElement(id)) {
                return id
            }
            var el = null;
            try {
                el = doc.getElementById(id)
            } catch (e) {}
            return el
        }

        function createElement(el) {
            return doc.createElement(el)
        }

        function toInt(str) {
            return parseInt(str, 10)
        }

        function addListener(target, eventType, fn) {
            target.attachEvent(eventType, fn);
            listenersArr[listenersArr.length] = [target, eventType, fn]
        }

        function hasPlayerVersion(rv) {
            rv += "";
            var pv = ua.pv,
                v = rv.split(".");
            v[0] = toInt(v[0]);
            v[1] = toInt(v[1]) || 0;
            v[2] = toInt(v[2]) || 0;
            return pv[0] > v[0] || pv[0] == v[0] && pv[1] > v[1] || pv[0] == v[0] && pv[1] == v[1] && pv[2] >= v[2] ? true : false
        }

        function createCSS(sel, decl, media, newStyle) {
            var h = doc.getElementsByTagName("head")[0];
            if (!h) {
                return
            }
            var m = typeof media == "string" ? media : "screen";
            if (newStyle) {
                dynamicStylesheet = null;
                dynamicStylesheetMedia = null
            }
            if (!dynamicStylesheet || dynamicStylesheetMedia != m) {
                var s = createElement("style");
                s.setAttribute("type", "text/css");
                s.setAttribute("media", m);
                dynamicStylesheet = h.appendChild(s);
                if (ua.ie && typeof doc.styleSheets != UNDEF && doc.styleSheets.length > 0) {
                    dynamicStylesheet = doc.styleSheets[doc.styleSheets.length - 1]
                }
                dynamicStylesheetMedia = m
            }
            if (dynamicStylesheet) {
                if (typeof dynamicStylesheet.addRule != UNDEF) {
                    dynamicStylesheet.addRule(sel, decl)
                } else if (typeof doc.createTextNode != UNDEF) {
                    dynamicStylesheet.appendChild(doc.createTextNode(sel + " {" + decl + "}"))
                }
            }
        }

        function setVisibility(id, isVisible) {
            if (!autoHideShow) {
                return
            }
            var v = isVisible ? "visible" : "hidden",
                el = getElementById(id);
            if (isDomLoaded && el) {
                el.style.visibility = v
            } else if (typeof id === "string") {
                createCSS("#" + id, "visibility:" + v)
            }
        }

        function urlEncodeIfNecessary(s) {
            var regex = /[\\\"<>\.;]/;
            var hasBadChars = regex.exec(s) != null;
            return hasBadChars && typeof encodeURIComponent != UNDEF ? encodeURIComponent(s) : s
        }
        var cleanup = function() {
            if (ua.ie) {
                window.attachEvent("onunload", function() {
                    var ll = listenersArr.length;
                    for (var i = 0; i < ll; i++) {
                        listenersArr[i][0].detachEvent(listenersArr[i][1], listenersArr[i][2])
                    }
                    var il = objIdArr.length;
                    for (var j = 0; j < il; j++) {
                        removeSWF(objIdArr[j])
                    }
                    for (var k in ua) {
                        ua[k] = null
                    }
                    ua = null;
                    for (var l in swfobject) {
                        swfobject[l] = null
                    }
                    swfobject = null
                })
            }
        }();
        return swfobject = {
            registerObject: function(objectIdStr, swfVersionStr, xiSwfUrlStr, callbackFn) {
                if (ua.w3 && objectIdStr && swfVersionStr) {
                    var regObj = {};
                    regObj.id = objectIdStr;
                    regObj.swfVersion = swfVersionStr;
                    regObj.expressInstall = xiSwfUrlStr;
                    regObj.callbackFn = callbackFn;
                    regObjArr[regObjArr.length] = regObj;
                    setVisibility(objectIdStr, false)
                } else if (callbackFn) {
                    callbackFn({
                        success: false,
                        id: objectIdStr
                    })
                }
            },
            getObjectById: function(objectIdStr) {
                if (ua.w3) {
                    return getObjectById(objectIdStr)
                }
            },
            embedSWF: function(swfUrlStr, replaceElemIdStr, widthStr, heightStr, swfVersionStr, xiSwfUrlStr, flashvarsObj, parObj, attObj, callbackFn) {
                var id = getId(replaceElemIdStr),
                    callbackObj = {
                        success: false,
                        id: id
                    };
                if (ua.w3 && !(ua.wk && ua.wk < 312) && swfUrlStr && replaceElemIdStr && widthStr && heightStr && swfVersionStr) {
                    setVisibility(id, false);
                    addDomLoadEvent(function() {
                        widthStr += "";
                        heightStr += "";
                        var att = {};
                        if (attObj && typeof attObj === OBJECT) {
                            for (var i in attObj) {
                                att[i] = attObj[i]
                            }
                        }
                        att.data = swfUrlStr;
                        att.width = widthStr;
                        att.height = heightStr;
                        var par = {};
                        if (parObj && typeof parObj === OBJECT) {
                            for (var j in parObj) {
                                par[j] = parObj[j]
                            }
                        }
                        if (flashvarsObj && typeof flashvarsObj === OBJECT) {
                            for (var k in flashvarsObj) {
                                if (flashvarsObj.hasOwnProperty(k)) {
                                    var key = encodeURI_enabled ? encodeURIComponent(k) : k,
                                        value = encodeURI_enabled ? encodeURIComponent(flashvarsObj[k]) : flashvarsObj[k];
                                    if (typeof par.flashvars != UNDEF) {
                                        par.flashvars += "&" + key + "=" + value
                                    } else {
                                        par.flashvars = key + "=" + value
                                    }
                                }
                            }
                        }
                        if (hasPlayerVersion(swfVersionStr)) {
                            var obj = createSWF(att, par, replaceElemIdStr);
                            if (att.id == id) {
                                setVisibility(id, true)
                            }
                            callbackObj.success = true;
                            callbackObj.ref = obj;
                            callbackObj.id = obj.id
                        } else if (xiSwfUrlStr && canExpressInstall()) {
                            att.data = xiSwfUrlStr;
                            showExpressInstall(att, par, replaceElemIdStr, callbackFn);
                            return
                        } else {
                            setVisibility(id, true)
                        }
                        if (callbackFn) {
                            callbackFn(callbackObj)
                        }
                    })
                } else if (callbackFn) {
                    callbackFn(callbackObj)
                }
            },
            switchOffAutoHideShow: function() {
                autoHideShow = false
            },
            enableUriEncoding: function(bool) {
                encodeURI_enabled = typeof bool === UNDEF ? true : bool
            },
            ua: ua,
            getFlashPlayerVersion: function() {
                return {
                    major: ua.pv[0],
                    minor: ua.pv[1],
                    release: ua.pv[2]
                }
            },
            hasFlashPlayerVersion: hasPlayerVersion,
            createSWF: function(attObj, parObj, replaceElemIdStr) {
                if (ua.w3) {
                    return createSWF(attObj, parObj, replaceElemIdStr)
                } else {
                    return undefined
                }
            },
            showExpressInstall: function(att, par, replaceElemIdStr, callbackFn) {
                if (ua.w3 && canExpressInstall()) {
                    showExpressInstall(att, par, replaceElemIdStr, callbackFn)
                }
            },
            removeSWF: function(objElemIdStr) {
                if (ua.w3) {
                    removeSWF(objElemIdStr)
                }
            },
            createCSS: function(selStr, declStr, mediaStr, newStyleBoolean) {
                if (ua.w3) {
                    createCSS(selStr, declStr, mediaStr, newStyleBoolean)
                }
            },
            addDomLoadEvent: addDomLoadEvent,
            addLoadEvent: addLoadEvent,
            getQueryParamValue: function(param) {
                var q = doc.location.search || doc.location.hash;
                if (q) {
                    if (/\?/.test(q)) {
                        q = q.split("?")[1]
                    }
                    if (param == null) {
                        return urlEncodeIfNecessary(q)
                    }
                    var pairs = q.split("&");
                    for (var i = 0; i < pairs.length; i++) {
                        if (pairs[i].substring(0, pairs[i].indexOf("=")) == param) {
                            return urlEncodeIfNecessary(pairs[i].substring(pairs[i].indexOf("=") + 1))
                        }
                    }
                }
                return ""
            },
            expressInstallCallback: function() {
                if (isExpressInstallActive) {
                    var obj = getElementById(EXPRESS_INSTALL_ID);
                    if (obj && storedFbContent) {
                        obj.parentNode.replaceChild(storedFbContent, obj);
                        if (storedFbContentId) {
                            setVisibility(storedFbContentId, true);
                            if (ua.ie) {
                                storedFbContent.style.display = "block"
                            }
                        }
                        if (storedCallbackFn) {
                            storedCallbackFn(storedCallbackObj)
                        }
                    }
                    isExpressInstallActive = false
                }
            },
            version: "2.3"
        }
    });
    define("flashaudioproxy", ["require", "exports", "module", "underscore", "errors", "vendor/events", "logger", "states", "vendor/swfobject"], function(require, exports, module) {
        var FlashAudioProxy, _ = require("underscore"),
            Errors = require("errors"),
            Events = require("vendor/events"),
            Logger = require("logger"),
            States = require("states"),
            swfobject = require("vendor/swfobject");
        module.exports = FlashAudioProxy = function(descriptor, settings) {
            this._descriptor = descriptor;
            this._id = descriptor.id;
            this._autoPlay = descriptor.autoPlay || false;
            FlashAudioProxy.players[descriptor.id] = this;
            this._errorMessage = null;
            this._errorID = null;
            this._state = States.INITIALIZE;
            this._settings = settings;
            this._volume = 1;
            this._muted = false;
            this._logger = new Logger(this.getType(), this._id, settings);
            if (!FlashAudioProxy.creatingFlashAudio) {
                if (FlashAudioProxy.flashAudio) {
                    this._createFlashAudio()
                } else {
                    FlashAudioProxy.createFlashObject(settings)
                }
            }
        };
        FlashAudioProxy.createFlashObject = function(settings) {
            FlashAudioProxy.creatingFlashAudio = true;
            FlashAudioProxy.containerElement = document.createElement("div");
            FlashAudioProxy.containerElement.setAttribute("id", settings.flashObjectID + "-container");
            FlashAudioProxy.flashElementTarget = document.createElement("div");
            FlashAudioProxy.flashElementTarget.setAttribute("id", settings.flashObjectID + "-target");
            FlashAudioProxy.containerElement.appendChild(FlashAudioProxy.flashElementTarget);
            document.body.appendChild(FlashAudioProxy.containerElement);
            var onFlashObjectCreated = function(respond) {
                if (!respond.success) {
                    for (var i in FlashAudioProxy.players) {
                        if (FlashAudioProxy.players.hasOwnProperty(i)) {
                            FlashAudioProxy.players[i]._errorID = Errors.FLASH_PROXY_CANT_LOAD_FLASH;
                            FlashAudioProxy.players[i]._errorMessage = "Cannot create flash object";
                            FlashAudioProxy.players[i]._setState(States.ERROR)
                        }
                    }
                    return
                }
                FlashAudioProxy.flashAudio = document.getElementById(settings.flashObjectID);
                setTimeout(function() {
                    if (FlashAudioProxy.flashAudio && !("PercentLoaded" in FlashAudioProxy.flashAudio)) {
                        for (var i in FlashAudioProxy.players) {
                            if (FlashAudioProxy.players.hasOwnProperty(i)) {
                                FlashAudioProxy.players[i]._errorID = Errors.FLASH_PROXY_FLASH_BLOCKED;
                                FlashAudioProxy.players[i]._errorMessage = "Flash object blocked";
                                FlashAudioProxy.players[i]._setState(States.ERROR);
                                FlashAudioProxy.players[i]._logger.type = FlashAudioProxy.players[i].getType();
                                FlashAudioProxy.players[i]._logger.log(FlashAudioProxy.players[i]._errorMessage)
                            }
                        }
                    }
                }, settings.flashLoadTimeout);
                FlashAudioProxy.flashAudio.onPositionChange = function(id, currentPosition, loadedPosition, duration) {
                    FlashAudioProxy.players[id]._onPositionChange(currentPosition, loadedPosition, duration)
                };
                FlashAudioProxy.flashAudio.onDebug = function(id, type, message) {
                    FlashAudioProxy.players[id]._logger.type = type;
                    FlashAudioProxy.players[id]._logger.log(message)
                };
                FlashAudioProxy.flashAudio.onStateChange = function(id, state) {
                    FlashAudioProxy.players[id]._setState(state);
                    if (state === States.DEAD) {
                        delete FlashAudioProxy.players[id]
                    }
                };
                FlashAudioProxy.flashAudio.onInit = function(id) {
                    FlashAudioProxy.creatingFlashAudio = false;
                    _.invoke(_.values(FlashAudioProxy.players), "_createFlashAudio")
                }
            };
            if (!document.getElementById(settings.flashObjectID)) {
                swfobject.embedSWF(settings.flashAudioPath, settings.flashObjectID + "-target", "1", "1", "9.0.24", "", {
                    json: encodeURIComponent(JSON.stringify(settings))
                }, {
                    allowscriptaccess: "always"
                }, {
                    id: settings.flashObjectID
                }, onFlashObjectCreated)
            }
        };
        FlashAudioProxy._ready = function() {
            return FlashAudioProxy.flashAudio && !FlashAudioProxy.creatingFlashAudio
        };
        _.extend(FlashAudioProxy.prototype, Events);
        FlashAudioProxy.players = {};
        FlashAudioProxy.prototype._createFlashAudio = function() {
            FlashAudioProxy.flashAudio.createAudio(this._descriptor);
            this._state = FlashAudioProxy.flashAudio.getState(this._id);
            this.setVolume(this._volume);
            this.setMute(this._muted);
            if (this._autoPlay) {
                this.play()
            }
        };
        FlashAudioProxy.prototype._setState = function(state) {
            if (this._state === state) {
                return
            }
            this._state = state;
            this.trigger("stateChange", state, this)
        };
        FlashAudioProxy.prototype._onPositionChange = function(currentPosition, loadedPosition, duration) {
            this.trigger("positionChange", currentPosition, loadedPosition, duration, this)
        };
        FlashAudioProxy.prototype.getId = function() {
            return this._id
        };
        FlashAudioProxy.prototype.getType = function() {
            if (!FlashAudioProxy._ready()) {
                return "Flash ..."
            }
            return FlashAudioProxy.flashAudio.getType(this._id)
        };
        FlashAudioProxy.prototype.getContainerElement = function() {
            return FlashAudioProxy.containerElement
        };
        FlashAudioProxy.prototype.play = function(position) {
            if (!FlashAudioProxy._ready()) {
                return
            }
            if (this.getState() === States.PAUSED || this.getState() === States.ENDED) {
                this.resume();
                return
            }
            position = position === undefined ? 0 : position;
            FlashAudioProxy.flashAudio.playAudio(this._id, position)
        };
        FlashAudioProxy.prototype.pause = function() {
            if (!FlashAudioProxy._ready()) {
                return
            }
            FlashAudioProxy.flashAudio.pauseAudio(this._id)
        };
        FlashAudioProxy.prototype.seek = function(position) {
            if (!FlashAudioProxy._ready()) {
                return
            }
            FlashAudioProxy.flashAudio.seekAudio(this._id, position)
        };
        FlashAudioProxy.prototype.resume = function() {
            if (!FlashAudioProxy._ready()) {
                return
            }
            FlashAudioProxy.flashAudio.resumeAudio(this._id)
        };
        FlashAudioProxy.prototype.setVolume = function(value) {
            this._volume = value;
            if (!FlashAudioProxy._ready()) {
                return
            }
            FlashAudioProxy.flashAudio.setVolume(this._id, value)
        };
        FlashAudioProxy.prototype.getVolume = function() {
            if (!FlashAudioProxy._ready()) {
                return this._volume
            }
            return FlashAudioProxy.flashAudio.getVolume(this._id)
        };
        FlashAudioProxy.prototype.setMute = function(value) {
            this._muted = value;
            if (!FlashAudioProxy._ready()) {
                return
            }
            FlashAudioProxy.flashAudio.setMute(this._id, value)
        };
        FlashAudioProxy.prototype.getMute = function() {
            if (!FlashAudioProxy._ready()) {
                return this._muted
            }
            return FlashAudioProxy.flashAudio.getMute(this._id)
        };
        FlashAudioProxy.prototype.getState = function() {
            return this._state
        };
        FlashAudioProxy.prototype.getCurrentPosition = function() {
            if (!FlashAudioProxy._ready()) {
                return 0
            }
            return FlashAudioProxy.flashAudio.getCurrentPosition(this._id)
        };
        FlashAudioProxy.prototype.getLoadedPosition = function() {
            if (!FlashAudioProxy._ready()) {
                return 0
            }
            return FlashAudioProxy.flashAudio.getLoadedPosition(this._id)
        };
        FlashAudioProxy.prototype.getDuration = function() {
            if (!FlashAudioProxy._ready()) {
                return 0
            }
            return FlashAudioProxy.flashAudio.getDuration(this._id)
        };
        FlashAudioProxy.prototype.kill = function() {
            if (!FlashAudioProxy._ready()) {
                return 0
            }
            FlashAudioProxy.flashAudio.killAudio(this._id)
        };
        FlashAudioProxy.prototype.getErrorMessage = function() {
            if (this._errorMessage) {
                return this._errorMessage
            }
            return FlashAudioProxy.flashAudio.getErrorMessage(this._id)
        };
        FlashAudioProxy.prototype.getErrorID = function() {
            if (this._errorID) {
                return this._errorID
            }
            return FlashAudioProxy.flashAudio.getErrorID(this._id)
        };
        FlashAudioProxy.prototype.getLevelNum = function() {
            if (!FlashAudioProxy._ready()) {
                return 0
            }
            return FlashAudioProxy.flashAudio.getLevelNum(this._id)
        };
        FlashAudioProxy.prototype.getLevel = function() {
            if (!FlashAudioProxy._ready()) {
                return 0
            }
            return FlashAudioProxy.flashAudio.getLevel(this._id)
        };
        FlashAudioProxy.prototype.setLevel = function(level) {
            if (!FlashAudioProxy._ready()) {
                return 0
            }
            return FlashAudioProxy.flashAudio.setLevel(this._id, level)
        };
        FlashAudioProxy.prototype.preload = function() {
            return false
        }
    });
    define("html5audioplayer", ["require", "exports", "module", "underscore", "vendor/events", "states", "errors", "logger"], function(require, exports, module) {
        var HTML5AudioPlayer, _ = require("underscore"),
            Events = require("vendor/events"),
            States = require("states"),
            Errors = require("errors"),
            Logger = require("logger");
        module.exports = HTML5AudioPlayer = function(descriptor, settings) {
            this._id = descriptor.id;
            this._descriptor = descriptor;
            this._isLoaded = false;
            this._settings = settings;
            this._bufferingTimeout = null;
            this._currentPosition = 0;
            this._loadedPosition = 0;
            this._prevCurrentPosition = 0;
            this._prevCheckTime = 0;
            this._prevComparison = 0;
            this._positionUpdateTimer = 0;
            this._playRequested = false;
            if (descriptor.duration) {
                this._duration = descriptor.duration
            }
            _.bindAll(this, "_onPositionChange", "_onStateChange", "_onLoaded", "_onBuffering");
            this._init();
            this.toggleEventListeners(true);
            if (this._descriptor.preload) {
                this.preload()
            }
            if (descriptor.autoPlay) {
                this.play()
            } else {
                this._setState(States.IDLE)
            }
        };
        _.extend(HTML5AudioPlayer.prototype, Events);
        HTML5AudioPlayer.prototype._init = function() {
            this._html5Audio = new Audio;
            this._html5Audio.id = this._settings.audioObjectID + "_" + this._descriptor.id;
            this._html5Audio.preload = "none";
            this._logger = new Logger(this.getType(), this._id, this._settings)
        };
        HTML5AudioPlayer.prototype.getId = function() {
            return this._id
        };
        HTML5AudioPlayer.prototype.getType = function() {
            return "HTML5 audio"
        };
        HTML5AudioPlayer.prototype.play = function(position) {
            if (this.isInOneOfStates(States.ERROR, States.DEAD)) {
                return
            }
            if (this.isInOneOfStates(States.PAUSED, States.ENDED)) {
                this.resume();
                return
            }
            this._logger.log("play");
            position = position || 0;
            this._setState(States.LOADING);
            this._playRequested = true;
            var playAfterLoaded = function() {
                if (!this._playRequested) {
                    return
                }
                this._logger.log("play after loaded");
                if (position > 0) {
                    this._html5Audio.currentTime = position / 1e3
                }
                this._html5Audio.play();
                clearInterval(this._positionUpdateTimer);
                this._positionUpdateTimer = setInterval(this._onPositionChange, this._settings.updateInterval)
            };
            if (this._isLoaded) {
                playAfterLoaded.apply(this)
            } else {
                this.preload();
                this.once("loaded", playAfterLoaded)
            }
        };
        HTML5AudioPlayer.prototype.pause = function() {
            this._playRequested = false;
            if (this.isInOneOfStates(States.ERROR, States.DEAD)) {
                return
            }
            this._logger.log("pause");
            this._html5Audio.pause();
            clearTimeout(this._bufferingTimeout);
            clearInterval(this._positionUpdateTimer)
        };
        HTML5AudioPlayer.prototype.seek = function(position) {
            var canSeek = false,
                positionSec, seekable = this._html5Audio.seekable,
                i;
            if (this.isInOneOfStates(States.ERROR, States.DEAD)) {
                return
            }
            if (!this._isLoaded) {
                this.once("loaded", function() {
                    this.seek(position)
                });
                return
            }
            positionSec = position / 1e3;
            for (i = 0; i < seekable.length; i++) {
                if (positionSec <= seekable.end(i) && positionSec >= seekable.start(i)) {
                    canSeek = true;
                    break
                }
            }
            if (!canSeek) {
                return
            }
            this._logger.log("seek");
            this._setState(States.SEEKING);
            this._html5Audio.currentTime = position / 1e3;
            clearTimeout(this._bufferingTimeout)
        };
        HTML5AudioPlayer.prototype.resume = function() {
            if (this.isInOneOfStates(States.ERROR, States.DEAD)) {
                return
            }
            this._logger.log("resume");
            if (this.getState() === States.PAUSED) {
                this._setState(States.LOADING);
                this._html5Audio.play(this._html5Audio.currentTime)
            } else if (this.getState() === States.ENDED) {
                this._setState(States.LOADING);
                this._html5Audio.play(0)
            }
            clearInterval(this._positionUpdateTimer);
            this._positionUpdateTimer = setInterval(this._onPositionChange, this._settings.updateInterval)
        };
        HTML5AudioPlayer.prototype.setVolume = function(value) {
            if (!this._html5Audio) {
                return
            }
            this._html5Audio.volume = value
        };
        HTML5AudioPlayer.prototype.getVolume = function() {
            if (!this._html5Audio) {
                return 1
            }
            return this._html5Audio.volume
        };
        HTML5AudioPlayer.prototype.setMute = function(value) {
            if (!this._html5Audio) {
                return
            }
            this._html5Audio.muted = value
        };
        HTML5AudioPlayer.prototype.getMute = function() {
            if (!this._html5Audio) {
                return false
            }
            return this._html5Audio.muted
        };
        HTML5AudioPlayer.prototype.getState = function() {
            return this._state
        };
        HTML5AudioPlayer.prototype.getCurrentPosition = function() {
            return this._currentPosition
        };
        HTML5AudioPlayer.prototype.getLoadedPosition = function() {
            return this._loadedPosition
        };
        HTML5AudioPlayer.prototype.getDuration = function() {
            return this._duration
        };
        HTML5AudioPlayer.prototype.kill = function() {
            if (this._state === States.DEAD) {
                return
            }
            clearInterval(this._positionUpdateTimer);
            clearTimeout(this._bufferingTimeout);
            this._playRequested = false;
            this.toggleEventListeners(false);
            this._html5Audio.pause();
            this._html5Audio.src = null;
            delete this._html5Audio;
            this._setState(States.DEAD)
        };
        HTML5AudioPlayer.prototype.getErrorMessage = function() {
            return this._errorMessage
        };
        HTML5AudioPlayer.prototype.getErrorID = function() {
            return this._errorID
        };
        HTML5AudioPlayer.prototype.preload = function() {
            var audio = this._html5Audio;
            if (audio.preload !== "auto") {
                this._logger.log("preload");
                audio.preload = "auto";
                audio.type = this._descriptor.mimeType;
                audio.src = this._descriptor.src;
                audio.load()
            }
        };
        HTML5AudioPlayer.prototype._setState = function(state) {
            if (this._state === state) {
                return
            }
            this._logger.log('state changed "' + state + '"');
            this._state = state;
            this.trigger("stateChange", state, this)
        };
        HTML5AudioPlayer.prototype.toggleEventListeners = function(on) {
            if (!this._html5Audio) {
                return
            }
            var dosmthEventListener = on ? "addEventListener" : "removeEventListener";
            ["ended", "play", "playing", "pause", "seeking", "waiting", "seeked", "error"].forEach(function(eventType) {
                this._html5Audio[dosmthEventListener](eventType, this._onStateChange)
            }, this);
            this._html5Audio[dosmthEventListener]("loadedmetadata", this._onLoaded)
        };
        HTML5AudioPlayer.prototype.isInOneOfStates = function() {
            for (var i in arguments) {
                if (arguments[i] === this._state) {
                    return true
                }
            }
            return false
        };
        HTML5AudioPlayer.prototype.updatePositions = function() {
            this._currentPosition = this._html5Audio.currentTime * 1e3;
            if (this._html5Audio.seekable.length > 0) {
                this._loadedPosition = this._html5Audio.seekable.end(0) * 1e3
            }
            if (this._duration === 0) {
                this._duration = this._html5Audio.duration * 1e3
            }
        };
        HTML5AudioPlayer.prototype._onBuffering = function() {
            this._setState(States.LOADING)
        };
        HTML5AudioPlayer.prototype._onLoaded = function() {
            this._isLoaded = true;
            this._logger.log("loaded");
            this.trigger("loaded", this)
        };
        HTML5AudioPlayer.prototype._onPositionChange = function(event) {
            this.updatePositions();
            this.trigger("positionChange", this._currentPosition, this._loadedPosition, this._duration, this);
            if (!this.isInOneOfStates(States.PLAYING, States.LOADING)) {
                return
            }
            var now = (new Date).valueOf(),
                positionDelta = this._currentPosition - this._prevCurrentPosition,
                realTimeDelta = now - this._prevCheckTime,
                comparison;
            if (realTimeDelta === 0) {
                return
            }
            comparison = positionDelta / realTimeDelta;
            if (comparison > .7) {
                clearTimeout(this._bufferingTimeout);
                this._setState(States.PLAYING);
                this._bufferingTimeout = null
            } else if (this._state === States.PLAYING && this._bufferingTimeout == null) {
                this._bufferingTimeout = setTimeout(this._onBuffering, this._settings.bufferingDelay)
            }
            this._prevCurrentPosition = this._currentPosition;
            this._prevCheckTime = now
        };
        HTML5AudioPlayer.prototype._onStateChange = function(event) {
            this._logger.log('html5 audio event "' + event.type + '"');
            clearTimeout(this._bufferingTimeout);
            switch (event.type) {
                case "playing":
                    this.updatePositions();
                    this._setState(States.PLAYING);
                    break;
                case "pause":
                    this._setState(States.PAUSED);
                    break;
                case "ended":
                    this._currentPosition = this._loadedPosition = this._duration;
                    this.trigger("positionChange", this._currentPosition, this._loadedPosition, this._duration, this);
                    this._setState(States.ENDED);
                    clearInterval(this._positionUpdateTimer);
                    break;
                case "waiting":
                    this._setState(States.LOADING);
                    break;
                case "seeking":
                    this._setState(States.SEEKING);
                    break;
                case "seeked":
                    this.updatePositions();
                    if (this._html5Audio.paused) {
                        this._setState(States.PAUSED)
                    } else {
                        this._setState(States.PLAYING)
                    }
                    break;
                case "error":
                    this._errorID = {
                        1: Errors.HTML5_AUDIO_ABORTED,
                        2: Errors.HTML5_AUDIO_NETWORK,
                        3: Errors.HTML5_AUDIO_DECODE,
                        4: Errors.HTML5_AUDIO_SRC_NOT_SUPPORTED
                    }[this._html5Audio.error.code];
                    this._errorMessage = this._getErrorMessage(this._errorID);
                    this._logger.log("html5 audio error: " + this._errorID + " " + this._errorMessage);
                    this._setState(States.ERROR);
                    this.toggleEventListeners(false);
                    break
            }
        };
        HTML5AudioPlayer.prototype._getErrorMessage = function(errorID) {
            var messages = {};
            messages[Errors.HTML5_AUDIO_ABORTED] = "The fetching process was aborted by the user.";
            messages[Errors.HTML5_AUDIO_NETWORK] = "A network connection lost.";
            messages[Errors.HTML5_AUDIO_DECODE] = "An error occurred while decoding the media resource.";
            messages[Errors.HTML5_AUDIO_SRC_NOT_SUPPORTED] = "The media resource is not suitable.";
            return messages[errorID]
        }
    });
    define("hlsaudioplayer", ["require", "exports", "module", "underscore", "errors", "vendor/events", "html5audioplayer", "logger", "states"], function(require, exports, module) {
        var HLSAudioPlayer, _ = require("underscore"),
            Errors = require("errors"),
            Events = require("vendor/events"),
            HTML5AudioPlayer = require("html5audioplayer"),
            Logger = require("logger"),
            States = require("states");
        module.exports = HLSAudioPlayer = function(descriptor, settings) {
            HTML5AudioPlayer.apply(this, arguments);
            this._seekPosition = 0
        };
        _.extend(HLSAudioPlayer.prototype, HTML5AudioPlayer.prototype);
        HLSAudioPlayer.prototype.getType = function() {
            return "HTML5 HLS audio"
        };
        HLSAudioPlayer.prototype.seek = function(position) {
            HTML5AudioPlayer.prototype.seek.apply(this, arguments);
            if (this.isInOneOfStates(States.LOADING)) {
                this._seekPosition = position
            }
        };
        HLSAudioPlayer.prototype.getCurrentPosition = function() {
            if (this.isInOneOfStates(States.LOADING) && this._seekPosition > 0) {
                return this._seekPosition
            }
            return HTML5AudioPlayer.prototype.getCurrentPosition.apply(this, arguments)
        };
        HLSAudioPlayer.prototype._onStateChange = function(event) {
            this._logger.log('hls html5 audio event "' + event.type + '"');
            clearTimeout(this._bufferingTimeout);
            switch (event.type) {
                case "playing":
                    this.updatePositions();
                    this._seekPosition = 0;
                    this._setState(States.PLAYING);
                    break;
                case "pause":
                    this._setState(States.PAUSED);
                    break;
                case "ended":
                    this._currentPosition = this._loadedPosition = this._duration;
                    this.trigger("positionChange", this._currentPosition, this._loadedPosition, this._duration, this);
                    this._setState(States.ENDED);
                    clearInterval(this._positionUpdateTimer);
                    break;
                case "waiting":
                    this._setState(States.LOADING);
                    break;
                case "seeking":
                    this._setState(States.SEEKING);
                    break;
                case "seeked":
                    this.updatePositions();
                    if (this._html5Audio.paused) {
                        this._setState(States.PAUSED)
                    }
                    break;
                case "error":
                    this._errorID = {
                        1: Errors.HTML5_AUDIO_ABORTED,
                        2: Errors.HTML5_AUDIO_NETWORK,
                        3: Errors.HTML5_AUDIO_DECODE,
                        4: Errors.HTML5_AUDIO_SRC_NOT_SUPPORTED
                    }[this._html5Audio.error.code];
                    this._errorMessage = this._getErrorMessage(this._errorID);
                    this._logger.log("html5 audio error: " + this._errorID + " " + this._errorMessage);
                    this._setState(States.ERROR);
                    this.toggleEventListeners(false);
                    break
            }
        }
    });
    define("singleaudioplayer", ["require", "exports", "module", "underscore", "browserutils", "errors", "vendor/events", "html5audioplayer", "logger", "states"], function(require, exports, module) {
        var SingleAudioPlayer, _ = require("underscore"),
            BrowserUtils = require("browserutils"),
            Errors = require("errors"),
            Events = require("vendor/events"),
            HTML5AudioPlayer = require("html5audioplayer"),
            Logger = require("logger"),
            States = require("states");
        module.exports = SingleAudioPlayer = function(descriptor, settings) {
            HTML5AudioPlayer.apply(this, arguments)
        };
        _.extend(SingleAudioPlayer.prototype, HTML5AudioPlayer.prototype);
        SingleAudioPlayer.prototype._init = function() {
            if (!SingleAudioPlayer._html5Audio) {
                var audioObj = new Audio;
                audioObj.id = this._settings.audioObjectID + "_Single";
                audioObj.preload = "none";
                SingleAudioPlayer._html5Audio = audioObj;
                this._preloadAudio = audioObj
            }
            this._html5Audio = SingleAudioPlayer._html5Audio;
            this._playRequested = false;
            this._logger = new Logger(this.getType(), this._id, this._settings)
        };
        SingleAudioPlayer.prototype.getType = function() {
            return "HTML5 single audio"
        };
        SingleAudioPlayer.prototype.play = function(position) {
            this._playRequested = true;
            if (this._html5Audio._playerId === this._descriptor.id) {
                HTML5AudioPlayer.prototype.resume.apply(this, arguments);
                return
            }
            if (this.isInOneOfStates(States.PAUSED)) {
                position = this._currentPosition
            }
            this._html5Audio._playerId = this._descriptor.id;
            this.toggleEventListeners(true);
            this._setState(States.LOADING);
            var playAfterLoaded = function() {
                if (!this._playRequested) {
                    return
                }
                this._logger.log("play after loaded");
                if (position > 0) {
                    this._html5Audio.currentTime = position / 1e3
                }
                this._html5Audio.play();
                clearInterval(this._positionUpdateTimer);
                this._positionUpdateTimer = setInterval(this._onPositionChange, this._settings.updateInterval)
            };
            if (this._html5Audio.readyState > 0 && this._descriptor.src === this._html5Audio.src) {
                playAfterLoaded.apply(this)
            } else {
                this.once("loaded", playAfterLoaded);
                this._html5Audio.type = this._descriptor.mimeType;
                this._html5Audio.src = this._descriptor.src;
                this._html5Audio.preload = "auto";
                this._html5Audio.load()
            }
        };
        SingleAudioPlayer.prototype.pause = function() {
            this._playRequested = false;
            if (this.isInOneOfStates(States.ERROR, States.DEAD)) {
                return
            }
            this._logger.log("pause");
            if (this._html5Audio._playerId === this._descriptor.id) {
                this._html5Audio.pause()
            } else {
                this.toggleEventListeners(false);
                this._setState(States.PAUSED)
            }
        };
        SingleAudioPlayer.prototype.seek = function(position) {
            if (this._html5Audio._playerId !== this._descriptor.id) {
                this._currentPosition = position;
                this.trigger("positionChange", this._currentPosition, this._loadedPosition, this._duration, this);
                return
            }
            HTML5AudioPlayer.prototype.seek.apply(this, arguments)
        };
        SingleAudioPlayer.prototype.kill = function() {
            if (this._state === States.DEAD) {
                return
            }
            this._playRequested = false;
            clearInterval(this._positionUpdateTimer);
            clearTimeout(this._bufferingTimeout);
            this.toggleEventListeners(false);
            this._setState(States.DEAD)
        };
        SingleAudioPlayer.prototype.resume = function() {
            if (this.isInOneOfStates(States.ERROR, States.DEAD)) {
                return
            }
            if (this._html5Audio._playerId !== this._descriptor.id) {
                this.play(this._currentPosition);
                return
            }
            HTML5AudioPlayer.prototype.resume.apply(this, arguments)
        };
        SingleAudioPlayer.prototype._onLoaded = function() {
            if (this.preventDefaultHandler()) {
                return
            }
            HTML5AudioPlayer.prototype._onLoaded.apply(this, arguments)
        };
        SingleAudioPlayer.prototype._onStateChange = function(event) {
            if (this.preventDefaultHandler()) {
                return
            }
            HTML5AudioPlayer.prototype._onStateChange.apply(this, arguments)
        };
        SingleAudioPlayer.prototype._onPositionChange = function(event) {
            if (this.preventDefaultHandler()) {
                return
            }
            HTML5AudioPlayer.prototype._onPositionChange.apply(this, arguments)
        };
        SingleAudioPlayer.prototype.preventDefaultHandler = function() {
            if (this._html5Audio._playerId !== this._descriptor.id) {
                if (this.isInOneOfStates(States.PLAYING, States.LOADING)) {
                    this.pause()
                }
                return true
            }
            return false
        };
        SingleAudioPlayer.prototype.preload = function() {
            if (!this._preloadAudio && BrowserUtils.supportSourceSwappingWithPreload()) {
                this._preloadAudio = new Audio;
                this._preloadAudio.preload = "none"
            }
            var audio = this._preloadAudio;
            if (audio && audio.preload !== "auto") {
                this._logger.log("preload");
                audio.preload = "auto";
                audio.type = this._descriptor.mimeType;
                audio.src = this._descriptor.src;
                audio.load()
            }
        }
    });
    define("hlssingleaudioplayer", ["require", "exports", "module", "underscore", "errors", "vendor/events", "hlsaudioplayer", "logger", "singleaudioplayer", "states"], function(require, exports, module) {
        var HLSSingleAudioPlayer, _ = require("underscore"),
            Errors = require("errors"),
            Events = require("vendor/events"),
            HLSAudioPlayer = require("hlsaudioplayer"),
            Logger = require("logger"),
            SingleAudioPlayer = require("singleaudioplayer"),
            States = require("states");
        module.exports = HLSSingleAudioPlayer = function(descriptor, settings) {
            SingleAudioPlayer.apply(this, arguments)
        };
        _.extend(HLSSingleAudioPlayer.prototype, SingleAudioPlayer.prototype);
        HLSSingleAudioPlayer.prototype.getType = function() {
            return "HTML5 HLS single audio"
        }
    });
    define("mimetypes", {
        AAC: "audio/aac",
        M3U8: "application/x-mpegURL",
        MP4: "audio/mp4",
        MPEG: "audio/mpeg",
        OGG: "audio/ogg",
        WAV: "audio/wav",
        WEBM: "audio/webm",
        getTypeByExtension: function(extension) {
            var types = {
                mp1: this.MPEG,
                mp2: this.MPEG,
                mp3: this.MPEG,
                mpeg: this.MPEG,
                mpg: this.MPEG,
                aac: this.AAC,
                mp4: this.MP4,
                ogg: this.OGG,
                oga: this.OGG,
                opus: this.OGG,
                webm: this.WEBM,
                wav: this.WAV,
                m3u8: this.M3U8
            };
            return types[extension] || null
        }
    });
    define("factory", ["require", "exports", "module", "underscore", "browserutils", "flashaudioproxy", "hlsaudioplayer", "hlssingleaudioplayer", "html5audioplayer", "mimetypes", "singleaudioplayer", "vendor/swfobject"], function(require, exports, module) {
        var DesktopFactory, _ = require("underscore"),
            BrowserUtils = require("browserutils"),
            FlashAudioProxy = require("flashaudioproxy"),
            HLSAudioPlayer = require("hlsaudioplayer"),
            HLSSingleAudioPlayer = require("hlssingleaudioplayer"),
            HTML5AudioPlayer = require("html5audioplayer"),
            MimeTypes = require("mimetypes"),
            SingleAudioPlayer = require("singleaudioplayer"),
            swfobject = require("vendor/swfobject");
        module.exports = DesktopFactory = function() {};
        DesktopFactory.createAudioPlayer = function(descriptor, settings) {
            var protocol, extension, player;
            protocol = descriptor.src.split(":")[0];
            if ((protocol === "rtmp" || protocol === "rtmpt" || descriptor.forceFlash) && !descriptor.forceHTML5) {
                player = new FlashAudioProxy(descriptor, settings)
            } else {
                descriptor.mimeType = DesktopFactory.getMimeType(descriptor);
                if (descriptor.mimeType === MimeTypes.M3U8) {
                    if (BrowserUtils.isNativeHlsSupported()) {
                        if (BrowserUtils.isMobile() || descriptor.forceSingle) {
                            player = new HLSSingleAudioPlayer(descriptor, settings)
                        } else {
                            player = new HLSAudioPlayer(descriptor, settings)
                        }
                    } else {
                        player = new FlashAudioProxy(descriptor, settings)
                    }
                } else if (BrowserUtils.supportHTML5Audio() && BrowserUtils.canPlayType(descriptor.mimeType) || descriptor.forceHTML5) {
                    if (BrowserUtils.isMobile() || descriptor.forceSingle) {
                        player = new SingleAudioPlayer(descriptor, settings)
                    } else {
                        player = new HTML5AudioPlayer(descriptor, settings)
                    }
                } else {
                    if (descriptor.mimeType === MimeTypes.MPEG) {
                        player = new FlashAudioProxy(descriptor, settings)
                    } else {
                        return null
                    }
                }
            }
            return player
        };
        DesktopFactory.getMimeType = function(descriptor) {
            if (descriptor.mimeType) {
                return descriptor.mimeType
            }
            var extension = descriptor.src.split("?")[0];
            extension = extension.substring(extension.lastIndexOf(".") + 1, extension.length);
            return MimeTypes.getTypeByExtension(extension)
        }
    });
    define("audiomanager", ["require", "exports", "module", "underscore", "factory", "states", "errors", "browserutils"], function(require, exports, module) {
        var AudioManager, _ = require("underscore"),
            PlayerFactory = require("factory"),
            States = require("states"),
            Errors = require("errors"),
            BrowserUtils = require("browserutils");
        module.exports = AudioManager = function(settings) {
            settings = settings || {};
            this._players = {};
            this._volume = 1;
            this._mute = false;
            this._settings = _.defaults(settings, AudioManager.defaults)
        };
        AudioManager.States = States;
        AudioManager.Errors = Errors;
        AudioManager.BrowserUtils = BrowserUtils;
        AudioManager.defaults = {
            flashAudioPath: "flashAudio.swf",
            flashLoadTimeout: 2e3,
            flashObjectID: "flashAudioObject",
            audioObjectID: "html5AudioObject",
            updateInterval: 300,
            bufferTime: 8e3,
            bufferingDelay: 800,
            debug: false
        };
        AudioManager.prototype.getAudioPlayer = function(id) {
            return this._players[id]
        };
        AudioManager.prototype.hasAudioPlayer = function(id) {
            return this._players[id] !== undefined
        };
        AudioManager.prototype.removeAudioPlayer = function(id) {
            if (this.hasAudioPlayer(id)) {
                delete this._players[id]
            }
        };
        AudioManager.prototype.setVolume = function(volume) {
            volume = Math.min(1, volume);
            this._volume = Math.max(0, volume);
            for (var id in this._players) {
                if (this._players.hasOwnProperty(id)) {
                    this._players[id].setVolume(this._volume)
                }
            }
        };
        AudioManager.prototype.getVolume = function() {
            return this._volume
        };
        AudioManager.prototype.setMute = function(value) {
            this._muted = value;
            for (var id in this._players) {
                if (this._players.hasOwnProperty(id)) {
                    this._players[id].setMute(this._muted)
                }
            }
        };
        AudioManager.prototype.getMute = function() {
            return this._muted
        };
        AudioManager.prototype.createAudioPlayer = function(descriptor) {
            var audioType, protocol, extension;
            if (!descriptor.id) {
                descriptor.id = Math.floor(Math.random() * 1e10).toString() + (new Date).getTime().toString()
            }
            if (!descriptor.src) {
                throw new Error("AudioManager: You need to pass a valid src")
            }
            if (!this._players[descriptor.id]) {
                this._players[descriptor.id] = PlayerFactory.createAudioPlayer(descriptor, this._settings)
            }
            this._players[descriptor.id].setVolume(this._volume);
            this._players[descriptor.id].setMute(this._muted);
            this._players[descriptor.id].on("stateChange", this._onStateChange, this);
            return this._players[descriptor.id]
        };
        AudioManager.prototype._onStateChange = function(state, player) {
            if (player.getState() === States.DEAD) {
                this.removeAudioPlayer(player.getId())
            }
        }
    });
    require(["audiomanager"]);
    return require("audiomanager")
});
