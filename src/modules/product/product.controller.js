import slugify from "slugify";
import categoryModel from "../../../DB/model/category.model.js";
import productModel from "../../../DB/model/product.model.js"
import subcategoryModel from "../../../DB/model/subcategory.model.js";
import cloudinary from "../../utls/cloudinary.js";
import { pagination } from "../../utls/pagination.js";
import { AppError } from './../../utls/AppError.js';


export const create = async(req,res,next)=>{
   const {name,price,discount,categoryId,subcategoryId} =req.body;
   const checkCategory = await categoryModel.findById(categoryId);
   if(!checkCategory){
    return next(new AppError('Category not found', 404));
  } 
   const checkSubCategory = await subcategoryModel.findOne({_id:subcategoryId,categoryId:categoryId});
   if(!checkSubCategory){
    return next(new AppError('Sub Category not found', 404));
  } 

   req.body.slug =slugify(name);
   req.body.finalPrice = price -((price * (discount || 0)) /100);

   const {secure_url,public_id} =await cloudinary.uploader.upload(req.files.image[0].path,
    {folder:`${process.env.APPNAME}/product/${name}`});
    req.body.image = {secure_url,public_id};
    req.body.subImages =[];
    if(req.files.subImages){
    for (const file  of req.files.subImages){
        const {secure_url,public_id} =await cloudinary.uploader.upload(file.path,
            {folder:`${process.env.APPNAME}/product/${name}/subImages`});
            req.body.subImages.push({secure_url,public_id});
    }
  }
    const product = await productModel.create(req.body);
    return next(new AppError('success', 201, { product }));
  }

export const getProducts = async (req, res,next) => {
  
  const {skip,limit} =pagination(req.query.page, req.query.limit);
  let queryObj ={...req.query};
  const execQuery = ['page','limit','sort','search','fields'];

  execQuery.map( (ele)=>{
   delete queryObj[ele];
  });

  queryObj =JSON.stringify(queryObj);
  queryObj = queryObj.replace(/gt|gte|lt|lte|in|nin|eq/g,match =>`$${match}`); 
  queryObj =JSON.parse(queryObj);

 

    const mongoseQuery =  productModel.find(queryObj).skip(skip).limit(limit);
   /* .populate({
      path:'reviews',
      populate:{
        path:'userId',
        select:'userName -_id',
      },
    })*/
    if(req.query.search){
      mongoseQuery.find({
        $or:[
         { name:{$regex:req.query.search}},
         { description:{$regex:req.query.search}}
        ]
      });
    }
    const count = await productModel.estimatedDocumentCount();
    mongoseQuery.select(req.query.fields);
    let products = await mongoseQuery.sort(req.query.sort);

    products =products.map(product=>{
      return{
        ...product.toObject(),
        image: product.image.secure_url,
        subImages:product.subImages.map(img=>img.secure_url)
      }

    });



    return next(new AppError('success', 200, { count, products }));
  };

