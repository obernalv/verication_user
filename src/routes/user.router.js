const { getAll, create, getOne, remove, update, verifyCode, login, reset_password_email, reset_password, getLoggerUser } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require('../utils/verifyJWT');

const userRouter = express.Router();

userRouter.route('/users')
    .get(verifyJWT, getAll)
    .post(create);



userRouter.route('/users/:id')
    .get(verifyJWT, getOne)
    .delete(verifyJWT, remove)
    .put(verifyJWT,update);

    userRouter.route('/users/verify/:code')
    .get(verifyCode);

userRouter.route('/users/login')
    .post(login);
    
userRouter.route('/users/reset_password')
    .post(reset_password_email);

userRouter.route('/users/reset_password/:code')
    .post(reset_password);

userRouter.route('/users/me')
    .get(verifyJWT, getLoggerUser)





module.exports = userRouter;