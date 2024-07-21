import cartModel from "../../../DB/model/cart.model.js";
import { AppError } from './../../utls/AppError.js';


export const get =async(req,res,next)=>{
    const cart = await cartModel.findOne({userId:req.user._id});
    return next(new AppError('success', 200, { products: cart.products }));
}
export const create =async(req,res,next)=>{

    const {productId} =req.body;

    const cart = await cartModel.findOne({userId:req.user._id});
    if(!cart){
        const newCart =await cartModel.create({
            userId:req.user._id,
            products:{productId}
        });
        return next(new AppError('success', 200, { cart: newCart }));
    }

    for(let i=0;i<cart.products.length;i++){
        if(cart.products[i].productId == productId){
            return next(new AppError('product already exists', 400));
        }
    }
    cart.products.push({productId:productId});
    await cart.save();

    return next(new AppError('success', 200, { cart }));
}

export const updateQuantity = async (req,res,next)=>{
    const {quantity,operator} =req.body;
    const inc= (operator == "+")?quantity:-quantity;
    const cart =await cartModel.findOneAndUpdate({userId:req.user._id,
        "products.productId":req.params.productId
    },
    {
        $inc:{
           "products.$.quantity":inc
        }
    },
    {
        new:true
    })

    return next(new AppError('success', 200, { cart }));
}

export const remove = async (req,res,next)=>{
    const {productId} =req.params;

    const cart =await cartModel.findOneAndUpdate({userId:req.user._id},{
        $pull:{
            products:{
                productId:productId
            }
        }
    },{new:true})

    return next(new AppError('success', 200, { cart }));
}

export const clearCart =async(req,res,next)=>{
    const cart =await cartModel.findOneAndUpdate({
        userId:req.user._id,
    },{
        products:[],
    },
    {
        new:true,
    }
);
    return next(new AppError('success', 200, { cart }));
}

