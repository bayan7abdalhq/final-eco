import categoryModel from "../../../DB/model/category.model.js";
import cloudinary from "../../utls/cloudinary.js";
import slugify from 'slugify';
import { AppError } from './../../utls/AppError.js';


export const create =async(req,res,next)=>{
    req.body.name = req.body.name.toLowerCase();
    
    if(await categoryModel.findOne({name:req.body.name})){
        return next(new AppError('category already exists', 409));
    }
    req.body.slug =slugify(req.body.name);
        const {secure_url,public_id} = await cloudinary.uploader.upload(req.file.path,{
            folder:`${process.env.APPNAME}/categories`,
        });
       
        req.body.image ={secure_url,public_id};
        req.body.createdBy =req.user._id;
        req.body.updatedBy =req.user._id;
    const category = await categoryModel.create(req.body);

    return next(new AppError('success', 200, { category }));
};

export const getAll =async(req,res,next)=>{
    const categories = await categoryModel.find({}).populate([{
        path:"createdBy",
        select:'userName',
    },
{
    path:"updatedBy",
    select:'userName',
},{
    path:'subcategory',
}]);
    return next(new AppError('success', 200, { categories }));
};
export const getActive =async(req,res,next)=>{
    const categories = await categoryModel.find({status:'Active'}).select("name");
    return next(new AppError('success', 200, { categories }));
};
export const getDetails =async(req,res,next)=>{
    const category = await categoryModel.findById(req.params.id);
    return next(new AppError('success', 200, { category }));
};
export const update = async(req,res,next)=>{

    const category = await categoryModel.findById(req.params.id);
    if(!category){
        return next(new AppError('category not found', 404));
    }

    category.name = req.body.name.toLowerCase();
    if(await categoryModel.findOne({name:req.body.name,_id:{$ne:req.params.id}})){
        return next(new AppError('name already exists', 409));
    }
    category.slug =slugify(req.body.name);
    if(req.file){
         const {secure_url,public_id} = await cloudinary.uploader.upload(req.file.path,{
            folder:`${process.env.APPNAME}/categories`,
        });
        cloudinary.uploader.destroy(category.image.public_id);
        category.image ={secure_url,public_id};
        }

        category.status =req.body.status;

        category.updatedBy = req.user._id;
        await category.save();
        return next(new AppError('success', 200, { category }));
};

export const destroy = async(req,res,next)=>{
    const category = await categoryModel.findByIdAndDelete(req.params.id);
    if(!category){
        return next(new AppError('category not found', 404));
    }
     await cloudinary.uploader.destroy(category.image.public_id);
     return next(new AppError('success', 200, { category }));
}

