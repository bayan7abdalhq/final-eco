import couponModel from "../../../DB/model/coupon.model.js"
import { AppError } from './../../utls/AppError.js';

export const create =async(req,res,next)=>{

    if(await couponModel.findOne({name:req.body.name})){
        return next(new AppError('coupon name already exists', 409));

    }
    req.body.expireDate = new Date(req.body.expireDate);
    const coupon = await couponModel.create(req.body);
    return next(new AppError('success', 201, { coupon }));

}