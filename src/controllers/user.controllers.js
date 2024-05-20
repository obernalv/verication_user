const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const sendEmail = require('../utils/sendEmail')
const jwt = require('jsonwebtoken');
const EmailCode = require('../models/EmailCode');


const getAll = catchError(async (req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async (req, res) => {

    const { email, password, firstName, lastName, country, image, frontBaseUrl } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // salt

    const result = await User.create(
        {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            image,
            country
        }
    );

    //para que la url se incluya en con el codigo en el enlace debe enviar un valor a: frontBaseUrl
    const code = require('crypto').randomBytes(32).toString('hex')
    const link = `${frontBaseUrl}/${code}`
    
    await EmailCode.create({

        code: code,
        userId: result.id
    });


    await sendEmail({
        to: email, // Email del receptor -obtenido de req.body
        subject: "Verificate email verificate-user", // asunto
        html: `
            
            <h1>Hola, ${firstName} ${lastName}</h1>
            <h3>Su cuenta ha sido creada!<h3>
            <p>Click en el enlace para verificarla</p>
            <a href="${link}">${link}</a>
            
        ` 
    })


    return res.status(201).json(result);
});

const getOne = catchError(async (req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if (!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async (req, res) => {
    const { id } = req.params;
    await User.destroy({ where: { id } });
    return res.sendStatus(204);
});

const update = catchError(async (req, res) => {
    const { id } = req.params;
    const { email, firstName, lastName, country, image } = req.body;

    const result = await User.update(
        { email, firstName, lastName, country, image },
        { where: { id }, returning: true }
    );
    if (result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});


const login = catchError(async (req, res) => {

    const { email, password, isVerified } = req.body;
    const user = await User.findOne({ where: { email: email } });

    if (!user)  return res.status(401).json({ message: "Login no valido" });
    if(!user.isVerified) return res.status(401).json({ message: "account no verified" })
    
    const isvalid = await bcrypt.compare(password, user.password);
    if (!isvalid) return res.status(401).json({ message: "Password invalid" })
    
    const token = jwt.sign(
        { user },
        process.env.TOKEN_SECRET,
        { expiresIn: "1d" } //durara 1 dia
    );

    return res.json({ user, token });
});


const verifyCode = catchError(async (req, res) => {
    const { code } = req.params;
    const emailCode = await EmailCode.findOne({where: {code: code}});
    if(!emailCode) return res.status(401).json({message: "Invalid code"})

     //actualizar el estado de la cuenta del usuario(V1)
    
    const user = await User.findByPk(emailCode.userId);
    user.isVerified = true;
    await user.save(); 


    //actualizar el estado de la cuenta del usuario(V2)
    // const user = await User.update(
    //     {isVerified: true},
    //     {where: emailCode.userId, returning: true
    // });

    //destruirr el codigo
    await emailCode.destroy();

    return res.json(user);
});


const reset_password_email = catchError(async(req, res) => {
    
    const { email, frontBaseUrl } = req.body;

    const userAccount = await User.findOne({
        where: {
            email: email
        }
    });

    if(!userAccount ) return res.status(401).json({message: "The account not exist!"})

    //enviar correo para el reset del password
    const code = require('crypto').randomBytes(32).toString('hex')
    const link = `${frontBaseUrl}/${code}`
    
    await EmailCode.create({

        code: code,
        userId: userAccount.id
    });

    await sendEmail({
        to: email, // Email del receptor
        subject: "Reset password", // asunto
        html: `
            <h1>Hola ${userAccount.firstName} ${userAccount.lastName}</h1>
            <p>Click on the link to change your password</p>
            <a href="${link}">${link}</a>
        ` 
    })

    
    return res.json(userAccount);
});


const reset_password = catchError(async (req, res) => {
    const { password } = req.body;
    const { code } = req.params;

    // Buscar el código en EmailCode
    const emailCode = await EmailCode.findOne({ where: { code: code } });
    if (!emailCode) return res.status(401).json({ message: "Invalid code" });

    // Encriptar la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar la contraseña del usuario
    const [updatedRows, [updatedUser]] = await User.update(
        { password: hashedPassword },
        { where: { id: emailCode.userId }, returning: true }
    );

    if (!updatedRows) return res.status(404).json({ message: "User not found" });
    

    // Eliminar el código de EmailCode
    await emailCode.destroy();

    // Devolver una respuesta exitosa
    return res.json({ message: "Password updated successfully", user: updatedUser });
});


const getLoggerUser = catchError(async(req, res) => {
    return res.json(req.user);
});

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    login,
    verifyCode,
    reset_password_email,
    reset_password,
    getLoggerUser
}