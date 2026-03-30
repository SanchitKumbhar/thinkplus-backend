const asynchandler=require('express-async-handler');
const User=require('../models/User');
const bcrypt=require('bcryptjs');



const createuser=asynchandler(async(req,res)=>{
    const {fullName,email,passwordHash,role}=req.body;
    const hashedPassword=await bcrypt.hash(passwordHash,12);
    const user=await User.create({fullName,email,passwordHash:hashedPassword,role});

    user.save().then(()=>{
        console.log('User created successfully');
    }).catch((err)=>{
        console.error('Error creating user:',err);
    });

    res.status(201).json(user);
});

const getusers=asynchandler(async(req,res)=>{
    const users=await User.find().select('-passwordHash');
    res.status(200).json(users);
});

const getuserbyid=asynchandler(async(req,res)=>{
    const user=await User.findById(req.params.id).select('-passwordHash');
    if(!user){
        res.status(404).json({message:'User not found'});
    }else{
        res.status(200).json(user);
    }
})

const updateuser=asynchandler(async(req,res)=>{
    const {fullName,email,passwordHash,role}=req.body;
    const user=await User.findById(req.params.id);
    if(!user){
        res.status(404).json({message:'User not found'});
    }else{
        user.fullName=fullName || user.fullName;
        user.email=email || user.email;
        if(passwordHash){
            user.passwordHash=await bcrypt.hash(passwordHash,12);
        }
        user.role=role || user.role;

        await user.save();
        res.status(200).json(user);
    }
});

const deleteuser=asynchandler(async(req,res)=>{ 
    const user=await User.findById(req.params.id);
    if(!user){
        res.status(404).json({message:'User not found'});
    }else{
        await user.remove();
        res.status(200).json({message:'User deleted successfully'});
    }
});


module.exports={createuser,getusers,getuserbyid,updateuser,deleteuser};