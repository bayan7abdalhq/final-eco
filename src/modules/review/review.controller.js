import orderModel from "../../../DB/model/order.model.js";
import reviewModel from "../../../DB/model/review.model.js";
import cloudinary from "../../utls/cloudinary.js";
import { AppError } from './../../utls/AppError.js';

export const create =async(req,res,next)=>{

    const {productId} = req.params;
    const {comment,rating} = req.body;

    const order =await orderModel.findOne({
        userId: req.user._id,
        status:'delivered',
        "products.productId": productId
    });


    if(!order){
        return next(new AppError("can't review this order", 400));
    }
    const checkReview = await reviewModel.findOne({
        userId: req.user._id,
        productId:productId,
    });

    if(checkReview){
        return next(new AppError('already reviewed this order', 409));
    }
    if(req.file){
        const {secure_url,public_id} =await cloudinary.uploader.upload(req.file.path,{
            folder:`${process.env.APPNAME}/${productId}/reviews`,
        });
        req.body.image ={secure_url,public_id};
    }
    const review = await reviewModel.create({
        comment,rating,
        productId,
        userId:req.user._id,
        image:req.body.image,
    });
    return next(new AppError('success', 201, { review }));
}