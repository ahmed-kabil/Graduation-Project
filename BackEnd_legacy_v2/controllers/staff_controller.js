
const Staff = require("../models/staff-model");
const Login = require("../models/login-model")
const bcrypt = require("bcryptjs")
const JWT = require("jsonwebtoken")
const {DocNurConversation} = require("../models/conversations-model")


//  here we need to get all readings that have different patient_id
const getAllStaff = async (req,res) => {
    try{
       //  console.log("trying to connect")
         const staff = await Staff.find();
      
 
         res.json({status: "success",data: {staff: staff}}) 
    }catch(err){
       res.status(400).json({status: "error",message: err.message})
    }
 
 }
 

 
 const addNewStaffMem = async (req, res) => {
    try{
      let data = await Staff.findOne({staff_id: req.body.staff_id})
     
      if(data){
         return res.status(400).json({status: "failed",data: "the staff_id already exist"});
      }
       let new_staff = await new Staff(req.body);
       if(new_staff.role === "nurse"){
            const Doctors = await Staff.find({role: "doctor"});
          for(let i = 0 ; i < Doctors.length ; i++){

            let new_convesation =   await new DocNurConversation({
               conversation_id: `conv_${Doctors[i].staff_id}_${new_staff.staff_id}`,
               doctor_id:Doctors[i].staff_id ,
               nurse_id:new_staff.staff_id ,
               nurse_name:new_staff.name,
               doctor_name:Doctors[i].name,
               last_message: '',
            })         

            await new_convesation.save()

          }


       }else if(new_staff.role === "doctor"){


         const Nurses = await Staff.find({role: "nurse"});
          for(let i = 0 ; i < Nurses.length ; i++){

            let new_convesation =   await new DocNurConversation({
               conversation_id: `conv_${new_staff.staff_id}_${Nurses[i].staff_id}`,
               doctor_id: new_staff.staff_id ,
               nurse_id: Nurses[i].staff_id,
               nurse_name:Nurses[i].name,
               doctor_name:new_staff.name,
               last_message: '',
            })         

            await new_convesation.save()

          }

       }


        let  password = new_staff.email.split('@')[0];
 
       let hashed_password =await bcrypt.hash(password , 6);
      
       let new_login = await new Login({
          user_id: new_staff.staff_id,
          email: new_staff.email,
          password: hashed_password,
          role: new_staff.role
       })
      
      await new_staff.save()
      await new_login.save()
     return res.status(201).json({status: "success",data: {staffMem: new_staff}});
   }catch(err){
   
          res.status(400).json({
          status: "error",
          message: err.message    
            
    })
   }
 
 }
 

const getDoctors = async (req,res) => {
    try{
       //  console.log("trying to connect")
         const Doctors = await Staff.find({role: "doctor"});
      
         res.json({status: "success",data: {Doctors: Doctors}}) 
    }catch(err){
       res.status(400).json({status: "error",message: err.message})
    }
 }


 const getNurses = async (req,res) => {
    try{
       //  console.log("trying to connect")
         const nurses = await Staff.find({role: "nurse"});
      
         res.json({status: "success",data: {nurses: nurses}}) 
    }catch(err){
       res.status(400).json({status: "error",message: err.message})
    }
 }


 const getReceptionists = async (req,res) => {
    try{
       //  console.log("trying to connect")
         const receptionists = await Staff.find({role: "receptionist"});
      
         res.json({status: "success",data: {receptionists: receptionists}}) 
    }catch(err){
       res.status(400).json({status: "error",message: err.message})
    }
 }
 

 const getStaffById = async (req,res)=> {
    try{
        
       const staffMem = await Staff.findOne({ staff_id: req.params.id });
       
       if(!staffMem){
         return res.status(404).json({status: "fail",data: null})
       }
       res.json({status: "success",data: {staffMem: staffMem}})
    }catch(err){
       res.status(400).json({
          status: "error",
          message: err.message
       })
    }
 }
 
 
// let for now delete only the patient from patients collection and keep the data in 
// future i need to store it for the analysis and delete it from readings db
const deleteStaffById = async (req,res)=>{
    try{
       let theStaffMem = await Staff.findOne({staff_id:req.params.id})
     
       if(theStaffMem.role == "nurse"){
        
          await DocNurConversation.deleteMany({nurse_id:req.params.id})
         }else if(theStaffMem.role == "doctor"){
            await DocNurConversation.deleteMany({doctor_id:req.params.id})
         }
         
       await Staff.deleteOne({ staff_id: req.params.id });
       await Login.deleteOne({ user_id: req.params.id });
       res.status(200).json({status: "success",data: null})
    }catch(err){
       res.status(400).json({status: "error",message: err.message})
    }
 }
 


 
 const updateStaffById = async (req,res)=>{
    let id = req.params.id ;
    try{
          const editedStaff = await Staff.findOneAndUpdate(
                { staff_id: id },       // find by patient_id
                { $set: req.body },       // update fields
                { new: true }             // return updated document
             );
          const editedUser = await Login.findOneAndUpdate(
             { user_id: id },       // find by patient_id
             { $set: req.body },       // update fields
             { new: true }             // return updated document
          )
          if(!editedStaff){
          res.status(404).json({status: "fail",data: null})
       }
       res.json({status: "success", data: {user: editedStaff}})
    }catch(err){
       res.status(400).json({status: "error",message: err.message})
    }
 }

 

 
module.exports = {
    getAllStaff,
    addNewStaffMem,
    getDoctors,
    getNurses,
    getReceptionists,
    getStaffById,
    deleteStaffById,
    updateStaffById,

    }