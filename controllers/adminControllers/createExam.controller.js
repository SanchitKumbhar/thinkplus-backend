const exammodel = require("../../models/Exam");
const asyncHandler = require("express-async-handler");


const createExam = asyncHandler(async (req, res) => {
    const { title, description, duration } = req.body;
    const newExam = await exammodel.create({ title, description, duration });
    res.status(201).json(newExam);
});

const getExams = asyncHandler(async (req, res) => {
    const exams = await exammodel.find()
    res.status(200).json(exams);
})

const getExamById = asyncHandler(async (req, res) => {
    const exam = await exammodel.findById(req.params.id);
    if (!exam) {
        res.status(404);
    }
    res.status(200).json(exam);
})

const updateExam = asyncHandler(async (req, res) => {
    const updateExam = await exammodel.findByIdAndUpdate(
        req.params.id,
        req.body, // 👈 automatically updates all fields sent
        {
            new: true,         // return updated document
            runValidators: true // apply schema validation
        }
    );

    res.status(200).json(updateExam);
});

const deleteExam = asyncHandler(async(req,res)=>{
    exammodel.findByIdAndDelete(req.params.id);
    res.status(201).json({"message" : "exam deleted"});
});

module.exports={
    createExam,
    getExams,
    getExamById,
    deleteExam
}