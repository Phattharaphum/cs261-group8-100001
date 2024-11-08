const User = require('../models/userModel');

exports.getAllUsers = (req, res) => {
    User.getAll((err, users) => {
        if (err) return res.status(500).send(err);
        res.json(users);
    });
};
