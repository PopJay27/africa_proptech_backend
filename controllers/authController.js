const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//const JWT_SECRET = "your_super_secret_key"; //later move to .env

//Register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role",
            [name, email, hashedPassword]
        );

        res.status(201).json(newUser.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined");
        }

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
         const user = result.rows[0];

         const isMatch = await bcrypt.compare(password, user.password);

         if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
         }

         const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
         );

         res.json({ token});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};