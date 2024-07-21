import userModel from './../../../DB/model/user.model.js';
import bcrypt from 'bcryptjs';
import jwt  from 'jsonwebtoken';
import SendEmail from '../../utls/email.js';
import { customAlphabet, nanoid } from 'nanoid';
import { AppError } from './../../utls/AppError.js';

export const register =async(req,res,next)=>{
    
    const {userName,email,password} = req.body;
    const hashedPassword =  bcrypt.hashSync(password, parseInt(process.env.SALTROUND));
    const createUser = await userModel.create({userName,email,password:hashedPassword});
    const token =jwt.sign({email},process.env.CONFIRM_EMAILTOKEN);
   await SendEmail(email,`welcome`,userName,token);
   return next(new AppError('success', 201, { user: createUser }));
}

export const login =async(req,res,next)=>{
    const {email,password} = req.body;
    const user = await userModel.findOne({email});
    if(!user){
        return next(new AppError(`invalid data`,400));
    }
    if(!user.confirmEmail){
        return next(new AppError(`please confirm your email`,400))
    }
    const match = await bcrypt.compare(password,user.password);
    if(user.status == "NotActive"){
        return next(new AppError(`your account is blocked`,400));
    }
    if(!match){
        return next(new AppError(`invalid data`,400));
    }
    const token = jwt.sign({id:user._id,role:user.role},process.env.LOGINSIG);
    return next(new AppError('success', 200, { token }));


}

export const confirmEmail = async(req,res,next)=>{
    const token =req.params.token;
    const decoded =jwt.verify(token,process.env.CONFIRM_EMAILTOKEN);

    await userModel.findOneAndUpdate({email:decoded.email},{confirmEmail:true});

     return next(new AppError(`success`,200));
}

export const sendCode=async(req,res,next)=>{
    const {email} = req.body;
    const code = customAlphabet('1234567890abcdef', 4)();
    const user =await userModel.findOneAndUpdate({email},{sendCode:code},{new:true});
    if(!user){
        return next(new AppError(`user not found`,404));

    }
    await SendEmail(email,`reset password`,`<h2>code is :${code}</h2>`);
    return next(new AppError(`success`,200));

}

export const forgetPassword = async(req,res,next)=>{
    const {email,password,code}=req.body;
    const user =await userModel.findOne({email});
    if(!user){
        return next(new AppError(`email not found`,404));
    }
    if(user.sendCode != code){
        return next(new AppError(`invalid code`,400));
    }
    user.password =await bcrypt.hash(password,parseInt(process.env.SALTROUND));
    user.sendCode=null;
    await user.save();
    return next(new AppError(`success`,200));

}