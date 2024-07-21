import userModel from "../../../DB/model/user.model.js"
import { AppError } from './../../utls/AppError.js';

export const getUsers =async(req,res,next)=>{
    const users = await userModel.find({});
    return next(new AppError('success', 200, { users }));
}

export const getUserData =async(req,res,next)=>{
    const user = await userModel.findById(req.user._id);

    return next(new AppError('success', 200, { user }));
}