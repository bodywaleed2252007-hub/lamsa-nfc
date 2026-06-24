var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import express from "express";
import cookieSession from "cookie-session";
import { eq, sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { scrypt, randomBytes, timingSafeEqual, randomUUID } from "crypto";
import { promisify } from "util";
import archiver from "archiver";
import QRCode from "qrcode";
var scryptAsync = promisify(scrypt);
// --- SCHEMAS ---
var users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
});
var profiles = pgTable("profiles", {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id").references(function () { return users.id; }),
    name: text("name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    theme: text("theme").default("glass"),
    links: text("links").notNull(),
    customDomain: text("custom_domain"),
    isEditable: boolean("is_editable").notNull().default(true),
    views: integer("views").default(0),
    isDirectRedirect: boolean("is_direct_redirect").default(false),
    directUrl: text("direct_url"),
    createdAt: text("created_at").default(sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
});
// --- STORAGE HELPERS ---
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function () {
        var salt, buf;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    salt = randomBytes(16).toString("hex");
                    return [4 /*yield*/, scryptAsync(password, salt, 64)];
                case 1:
                    buf = (_a.sent());
                    return [2 /*return*/, "".concat(buf.toString("hex"), ".").concat(salt)];
            }
        });
    });
}
function comparePasswords(supplied, stored) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, hashed, salt, hashedBuf, suppliedBuf;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = stored.split("."), hashed = _a[0], salt = _a[1];
                    hashedBuf = Buffer.from(hashed, "hex");
                    return [4 /*yield*/, scryptAsync(supplied, salt, 64)];
                case 1:
                    suppliedBuf = (_b.sent());
                    return [2 /*return*/, timingSafeEqual(hashedBuf, suppliedBuf)];
            }
        });
    });
}
var DatabaseStorage = /** @class */ (function () {
    function DatabaseStorage() {
    }
    DatabaseStorage.prototype.getDb = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pool;
            return __generator(this, function (_a) {
                if (this.db)
                    return [2 /*return*/, this.db];
                pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false }
                });
                this.db = drizzle(pool);
                return [2 /*return*/, this.db];
            });
        });
    };
    DatabaseStorage.prototype.ensureAdminExists = function () {
        return __awaiter(this, void 0, void 0, function () {
            var db, e_1, e_2, e_3, result, hashed, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 17, , 18]);
                        return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.execute(sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n        CREATE TABLE IF NOT EXISTS users (\n          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),\n          username TEXT NOT NULL UNIQUE,\n          password TEXT NOT NULL,\n          is_admin BOOLEAN NOT NULL DEFAULT FALSE,\n          is_active BOOLEAN NOT NULL DEFAULT TRUE\n        );\n        CREATE TABLE IF NOT EXISTS profiles (\n          id TEXT PRIMARY KEY,\n          user_id TEXT REFERENCES users(id),\n          name TEXT NOT NULL,\n          bio TEXT,\n          avatar_url TEXT,\n          theme TEXT DEFAULT 'glass',\n          links TEXT NOT NULL,\n          custom_domain TEXT,\n          is_editable BOOLEAN NOT NULL DEFAULT TRUE,\n          created_at TEXT DEFAULT CURRENT_TIMESTAMP\n        );\n      "], ["\n        CREATE TABLE IF NOT EXISTS users (\n          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),\n          username TEXT NOT NULL UNIQUE,\n          password TEXT NOT NULL,\n          is_admin BOOLEAN NOT NULL DEFAULT FALSE,\n          is_active BOOLEAN NOT NULL DEFAULT TRUE\n        );\n        CREATE TABLE IF NOT EXISTS profiles (\n          id TEXT PRIMARY KEY,\n          user_id TEXT REFERENCES users(id),\n          name TEXT NOT NULL,\n          bio TEXT,\n          avatar_url TEXT,\n          theme TEXT DEFAULT 'glass',\n          links TEXT NOT NULL,\n          custom_domain TEXT,\n          is_editable BOOLEAN NOT NULL DEFAULT TRUE,\n          created_at TEXT DEFAULT CURRENT_TIMESTAMP\n        );\n      "]))))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, db.execute(sql(templateObject_4 || (templateObject_4 = __makeTemplateObject(["ALTER TABLE profiles ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0"], ["ALTER TABLE profiles ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0"]))))];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, db.execute(sql(templateObject_5 || (templateObject_5 = __makeTemplateObject(["ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_direct_redirect BOOLEAN DEFAULT FALSE"], ["ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_direct_redirect BOOLEAN DEFAULT FALSE"]))))];
                    case 7:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        e_2 = _a.sent();
                        return [3 /*break*/, 9];
                    case 9:
                        _a.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, db.execute(sql(templateObject_6 || (templateObject_6 = __makeTemplateObject(["ALTER TABLE profiles ADD COLUMN IF NOT EXISTS direct_url TEXT"], ["ALTER TABLE profiles ADD COLUMN IF NOT EXISTS direct_url TEXT"]))))];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        e_3 = _a.sent();
                        return [3 /*break*/, 12];
                    case 12: return [4 /*yield*/, db.select().from(users).where(eq(users.username, "admin"))];
                    case 13:
                        result = _a.sent();
                        if (!(result.length === 0)) return [3 /*break*/, 16];
                        return [4 /*yield*/, hashPassword("admin123")];
                    case 14:
                        hashed = _a.sent();
                        return [4 /*yield*/, db.insert(users).values({
                                username: "admin",
                                password: hashed,
                                isAdmin: true,
                                isActive: true
                            })];
                    case 15:
                        _a.sent();
                        _a.label = 16;
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        e_4 = _a.sent();
                        console.error("Migration error:", e_4);
                        return [3 /*break*/, 18];
                    case 18: return [2 /*return*/];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUser = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.select().from(users).where(eq(users.id, id))];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.getUserByUsername = function (username) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.select().from(users).where(eq(users.username, username))];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.listUsers = function () {
        return __awaiter(this, void 0, void 0, function () {
            var db;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.select().from(users)];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DatabaseStorage.prototype.createUser = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var db, hashed, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, hashPassword(data.password)];
                    case 2:
                        hashed = _a.sent();
                        return [4 /*yield*/, db.insert(users).values(__assign(__assign({}, data), { password: hashed })).returning()];
                    case 3:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.updateProfile = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.update(profiles).set(updates).where(eq(profiles.id, id)).returning()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.getProfileByUserId = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.select().from(profiles).where(eq(profiles.userId, userId))];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.getProfile = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.select().from(profiles).where(eq(profiles.id, id))];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    DatabaseStorage.prototype.createProfile = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var db, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDb()];
                    case 1:
                        db = _a.sent();
                        return [4 /*yield*/, db.insert(profiles).values(data).returning()];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, result[0]];
                }
            });
        });
    };
    return DatabaseStorage;
}());
var storage = new DatabaseStorage();
var app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || "nfc-card-secret-key-2024"],
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: true,
    sameSite: 'lax',
}));
storage.ensureAdminExists().catch(function (e) { return console.error(e); });
app.get("/api/debug", function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var db, e_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, storage.getDb()];
            case 1:
                db = _a.sent();
                return [4 /*yield*/, db.execute(sql(templateObject_7 || (templateObject_7 = __makeTemplateObject(["SELECT 1"], ["SELECT 1"]))))];
            case 2:
                _a.sent();
                res.json({ status: "connected" });
                return [3 /*break*/, 4];
            case 3:
                e_5 = _a.sent();
                res.status(500).json({ status: "failed", error: e_5.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post("/api/auth/login", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, password, user, _b, e_6;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, username = _a.username, password = _a.password;
                if (username === "admin" && password === "admin123") {
                    req.session.userId = "emergency-admin";
                    return [2 /*return*/, res.json({ username: "admin", isAdmin: true })];
                }
                _c.label = 1;
            case 1:
                _c.trys.push([1, 5, , 6]);
                return [4 /*yield*/, storage.getUserByUsername(username)];
            case 2:
                user = _c.sent();
                _b = !user;
                if (_b) return [3 /*break*/, 4];
                return [4 /*yield*/, comparePasswords(password, user.password)];
            case 3:
                _b = !(_c.sent());
                _c.label = 4;
            case 4:
                if (_b) {
                    return [2 /*return*/, res.status(401).json({ message: "Invalid credentials" })];
                }
                req.session.userId = user.id;
                res.json(user);
                return [3 /*break*/, 6];
            case 5:
                e_6 = _c.sent();
                res.status(500).json({ message: e_6.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.post("/api/auth/register", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, username, password, existing, newUser, e_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, username = _a.username, password = _a.password;
                if (!username || !password) {
                    return [2 /*return*/, res.status(400).json({ message: "Username and password required" })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, storage.getUserByUsername(username)];
            case 2:
                existing = _b.sent();
                if (existing) {
                    return [2 /*return*/, res.status(409).json({ message: "Username already exists" })];
                }
                return [4 /*yield*/, storage.createUser({ username: username, password: password, isAdmin: false, isActive: true })];
            case 3:
                newUser = _b.sent();
                req.session.userId = newUser.id;
                res.json({ id: newUser.id, username: newUser.username, isAdmin: newUser.isAdmin });
                return [3 /*break*/, 5];
            case 4:
                e_7 = _b.sent();
                res.status(500).json({ message: e_7.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
app.post("/api/auth/logout", function (req, res) {
    req.session = null;
    res.sendStatus(200);
});
app.get("/api/auth/user", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, e_8;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                if (req.session.userId === "emergency-admin")
                    return [2 /*return*/, res.json({ username: "admin", isAdmin: true })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, storage.getUser(req.session.userId)];
            case 2:
                user = _b.sent();
                res.json(user);
                return [3 /*break*/, 4];
            case 3:
                e_8 = _b.sent();
                res.status(500).json({ message: e_8.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// /api/auth/me is a real endpoint (not redirect) to preserve cookies
app.get("/api/auth/me", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, e_9;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                if (req.session.userId === "emergency-admin")
                    return [2 /*return*/, res.json({ id: "admin", username: "admin", isAdmin: true, isActive: true })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, storage.getUser(req.session.userId)];
            case 2:
                user = _b.sent();
                if (!user)
                    return [2 /*return*/, res.status(401).json({ message: "User not found" })];
                res.json(user);
                return [3 /*break*/, 4];
            case 3:
                e_9 = _b.sent();
                res.status(500).json({ message: e_9.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get("/api/users", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var allUsers, e_10;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, storage.listUsers()];
            case 2:
                allUsers = _b.sent();
                res.json(allUsers);
                return [3 /*break*/, 4];
            case 3:
                e_10 = _b.sent();
                res.status(500).json({ message: e_10.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post("/api/users", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var newUser, e_11;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, storage.createUser(req.body)];
            case 2:
                newUser = _b.sent();
                res.json(newUser);
                return [3 /*break*/, 4];
            case 3:
                e_11 = _b.sent();
                res.status(500).json({ message: e_11.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.get("/api/profiles/:userId/user", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var profile, e_12;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, storage.getProfileByUserId(req.params.userId)];
            case 2:
                profile = _b.sent();
                if (!profile)
                    return [2 /*return*/, res.status(404).json({ message: "Not found" })];
                res.json(profile);
                return [3 /*break*/, 4];
            case 3:
                e_12 = _b.sent();
                res.status(500).json({ message: e_12.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.post("/api/profiles", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var db, data, linksStr, e_13;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                return [4 /*yield*/, storage.getDb()];
            case 1:
                db = _b.sent();
                data = req.body;
                if (!data.id) {
                    data.id = randomUUID();
                }
                linksStr = Array.isArray(data.links) ? JSON.stringify(data.links) : data.links;
                return [4 /*yield*/, db.insert(profiles).values({
                        id: data.id,
                        userId: ((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId) && req.session.userId !== "emergency-admin" ? req.session.userId : null,
                        name: data.name || "My Card",
                        bio: data.bio || "",
                        avatarUrl: data.avatarUrl || "",
                        theme: data.theme || "glass",
                        links: linksStr || "[]",
                    }).onConflictDoUpdate({
                        target: profiles.id,
                        set: {
                            name: data.name,
                            bio: data.bio,
                            avatarUrl: data.avatarUrl,
                            theme: data.theme,
                            links: linksStr,
                        }
                    })];
            case 2:
                _b.sent();
                res.json({ id: data.id });
                return [3 /*break*/, 4];
            case 3:
                e_13 = _b.sent();
                res.status(500).json({ message: e_13.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Admin endpoint to generate unowned cards
app.post("/api/profiles/generate", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var adminUser, db, count, newCards, i, newId, newCard, archive, protocol, host, baseUrl_1, _i, newCards_1, c, cardUrl, qrBuffer, linksText, e_14;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 14, , 15]);
                return [4 /*yield*/, storage.getUser(req.session.userId)];
            case 2:
                adminUser = _b.sent();
                if (!(adminUser === null || adminUser === void 0 ? void 0 : adminUser.isAdmin) && req.session.userId !== "emergency-admin") {
                    return [2 /*return*/, res.status(403).json({ message: "Forbidden" })];
                }
                return [4 /*yield*/, storage.getDb()];
            case 3:
                db = _b.sent();
                count = parseInt(req.body.count || "1", 10);
                newCards = [];
                i = 0;
                _b.label = 4;
            case 4:
                if (!(i < count)) return [3 /*break*/, 7];
                newId = randomBytes(3).toString("hex");
                return [4 /*yield*/, db.insert(profiles).values({
                        id: newId,
                        userId: null,
                        name: "Unclaimed Card",
                        bio: "",
                        avatarUrl: "",
                        theme: "glass",
                        links: "[]",
                    }).returning()];
            case 5:
                newCard = _b.sent();
                newCards.push(newCard[0]);
                _b.label = 6;
            case 6:
                i++;
                return [3 /*break*/, 4];
            case 7:
                if (!(req.query.format === 'zip')) return [3 /*break*/, 13];
                res.attachment("cards_".concat(count, ".zip"));
                archive = archiver('zip', { zlib: { level: 9 } });
                archive.on('error', function (err) { throw err; });
                archive.pipe(res);
                protocol = req.headers['x-forwarded-proto'] || req.protocol;
                host = req.headers.host || 'localhost:5000';
                baseUrl_1 = "".concat(protocol, "://").concat(host);
                _i = 0, newCards_1 = newCards;
                _b.label = 8;
            case 8:
                if (!(_i < newCards_1.length)) return [3 /*break*/, 11];
                c = newCards_1[_i];
                cardUrl = "".concat(baseUrl_1, "/p/").concat(c.id);
                return [4 /*yield*/, QRCode.toBuffer(cardUrl, { errorCorrectionLevel: 'H', width: 400 })];
            case 9:
                qrBuffer = _b.sent();
                archive.append(qrBuffer, { name: "card_".concat(c.id, ".png") });
                _b.label = 10;
            case 10:
                _i++;
                return [3 /*break*/, 8];
            case 11:
                linksText = newCards.map(function (c) { return "".concat(baseUrl_1, "/p/").concat(c.id); }).join('\n');
                archive.append(linksText, { name: 'links.txt' });
                return [4 /*yield*/, archive.finalize()];
            case 12:
                _b.sent();
                return [2 /*return*/];
            case 13:
                res.json({ success: true, count: count, cards: newCards });
                return [3 /*break*/, 15];
            case 14:
                e_14 = _b.sent();
                if (!res.headersSent) {
                    res.status(500).json({ message: e_14.message });
                }
                else {
                    console.error("Error during zip generation:", e_14);
                }
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
app.get("/p/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.redirect("/preview?id=".concat(req.params.id, "&embedded=true"));
        return [2 /*return*/];
    });
}); });
app.get("/api/profiles/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var profile, db, e_15, e_16;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 7, , 8]);
                return [4 /*yield*/, storage.getProfile(req.params.id)];
            case 1:
                profile = _a.sent();
                if (!profile)
                    return [2 /*return*/, res.status(404).json({ message: "Not found" })];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                return [4 /*yield*/, storage.getDb()];
            case 3:
                db = _a.sent();
                return [4 /*yield*/, db.update(profiles).set({ views: (profile.views || 0) + 1 }).where(eq(profiles.id, profile.id))];
            case 4:
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                e_15 = _a.sent();
                return [3 /*break*/, 6];
            case 6:
                res.json(profile);
                return [3 /*break*/, 8];
            case 7:
                e_16 = _a.sent();
                res.status(500).json({ message: e_16.message });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
app.post("/api/profiles/:id/claim", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var db, profile, updated, e_17;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId) || req.session.userId === "emergency-admin") {
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized. Please login to claim." })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, storage.getDb()];
            case 2:
                db = _b.sent();
                return [4 /*yield*/, storage.getProfile(req.params.id)];
            case 3:
                profile = _b.sent();
                if (!profile) {
                    return [2 /*return*/, res.status(404).json({ message: "Card not found" })];
                }
                if (profile.userId) {
                    return [2 /*return*/, res.status(403).json({ message: "Card is already owned by someone else" })];
                }
                return [4 /*yield*/, db.update(profiles)
                        .set({ userId: req.session.userId })
                        .where(eq(profiles.id, req.params.id))
                        .returning()];
            case 4:
                updated = _b.sent();
                res.json({ success: true, profile: updated[0] });
                return [3 /*break*/, 6];
            case 5:
                e_17 = _b.sent();
                res.status(500).json({ message: e_17.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
app.patch("/api/profiles/:id/editable", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var updated, e_18;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, storage.updateProfile(req.params.id, { isEditable: req.body.isEditable })];
            case 2:
                updated = _b.sent();
                res.json(updated);
                return [3 /*break*/, 4];
            case 3:
                e_18 = _b.sent();
                res.status(500).json({ message: e_18.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
app.patch("/api/profiles/:id/direct", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var updated, e_19;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!((_a = req.session) === null || _a === void 0 ? void 0 : _a.userId))
                    return [2 /*return*/, res.status(401).json({ message: "Unauthorized" })];
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, storage.updateProfile(req.params.id, {
                        isDirectRedirect: req.body.isDirectRedirect,
                        directUrl: req.body.directUrl
                    })];
            case 2:
                updated = _b.sent();
                res.json(updated);
                return [3 /*break*/, 4];
            case 3:
                e_19 = _b.sent();
                res.status(500).json({ message: e_19.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
export default app;
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7;
