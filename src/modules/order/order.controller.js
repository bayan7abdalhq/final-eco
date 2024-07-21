import cartModel from "../../../DB/model/cart.model.js"
import couponModel from "../../../DB/model/coupon.model.js";
import orderModel from "../../../DB/model/order.model.js";
import productModel from "../../../DB/model/product.model.js";
import userModel from "../../../DB/model/user.model.js";
import { AppError } from './../../utls/AppError.js';


import Stripe from 'stripe';
const stripe = new Stripe('sk_test_51PZEjX2KUl56m10kRW47auYzvHAZYAP5RLlK9CsBIdgKsFSPyIJ9grmEewouT3dTvRNf2L7zyk3ynZ121MSFrQRD00EN1WRaxP');

export const create =async(req,res,next)=>{
    const {couponName} =req.body;
    const cart = await cartModel.findOne({userId:req.user._id});
    if(!cart || cart.products.length === 0){
        return next(new AppError('cart is empty', 400));
    }
    req.body.products = cart.products;
    if(couponName){
        const coupon = await couponModel.findOne({name:couponName});
        if(!coupon){
            return next(new AppError('coupon not found', 400));
        }
    
    if(coupon.expireDate <new Date()){
        return next(new AppError('coupon expired', 400));
    }
    if(coupon.usedBy.includes(req.user._id)){
        return next(new AppError('coupon already used', 400));
    }
    req.body.coupon =coupon;
    }
    let finalProductList =[];
    let subTotal = 0;
    for(let product of req.body.products){
        const checkProduct = await productModel.findOne({
        
            _id:product.productId,
            stock:{$gte:product.quantity}
        });
        if(!checkProduct){
            return next(new AppError('product quantity not available', 400));
        }
        product =product.toObject();
        product.name = checkProduct.name;
        product.unitPrice = checkProduct.price;
        product.discount = checkProduct.discount;
        product.finalPrice =product.quantity * checkProduct.finalPrice;
        subTotal+=product.finalPrice;

        finalProductList.push(product);
    }
    const user = await userModel.findById(req.user._id);
    if(!req.body.address){
        req.body.address = user.address;
    }
    if(!req.body.phone){
        req.body.phone = user.phone;
    }

    const session = await stripe.checkout.sessions.create({
        line_items:[{
            price_data:{
                currency: `USD`,
                unit_amount:subTotal - (subTotal *( (req.body.coupon?.amount||0) )/100),
                product_data:{
                    name:user.userName
                }
            },
            quantity:1
        }],
        mode: 'payment',
        success_url: `http://www.facebook.com`,
        cancel_url: `http://www.youtube.com`,
    });
    
    const order = await orderModel.create({
        userId:req.user._id,
        products:finalProductList,
        finalPrice:subTotal - (subTotal *( (req.body.coupon?.amount||0) )/100),
        address:req.body.address,
        phoneNumber:req.body.phone,
        updatedBy:req.user._id

    });
    if(order){
        for(const product of req.body.products){
            await productModel.findOneAndUpdate({_id:product.productId},
           {
            $inc:{
                stock:-product.quantity,
            }
           }
        )
        }
        if(req.body.coupon){
            await couponModel.updateOne({_id:req.body.coupon._id},{
                $addToSet:{
                    usedBy:req.user._id
                }
            })
        }
        await cartModel.updateOne({userId:req.user._id},{
            products:[],
        })

    }
    return next(new AppError('success', 200, { order }));
}

export const getOrders = async(req,res,next)=>{
    const orders = await orderModel.find({$or:[
        {
            status:'pending',
        },
        {
            status:'confirmed',
        }
    ]});
    return next(new AppError('success', 200, { orders }));
}

export const getUserOrders = async(req,res,next)=>{
    const orders = await orderModel.find({userId:req.user._id});
    
    return next(new AppError('success', 200, { orders }));

}

export const changeStatus = async(req,res,next)=>{
    const {orderId} = req.params;
    const {status} = req.body;

    const order = await orderModel.findById(orderId);
    if(!order){
        return next(new AppError('order not found', 404));

    }
    order.status = status;
    await order.save();
    return next(new AppError('success', 200, { order }));
}