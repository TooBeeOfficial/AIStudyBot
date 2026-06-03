export default class GroqModel {
    static LLAMA_31_8B_INSTANT = new GroqModel(
        "llama-3.1-8b-instant",
        1024,
        0
    );
    static LLAMA_33_70B = new GroqModel(
        "llama-3.3-70b-versatile",
        1024,
        1
    );
    static META_LLAMA = new GroqModel(
        "meta-llama/llama-4-scout-17b-16e-instruct",
        1024,
        2
    );
    static GPT_OSS_120B = new GroqModel(
        "openai/gpt-oss-120b",
        8192,
        3
    );
    static GPT_OSS_20B = new GroqModel(
        "openai/gpt-oss-20b",
        8192,
        4
    );
    static GROQ_COMPOUND = new GroqModel(
        "groq/compound",
        1024,
        5
    );

    constructor(modelName, maxCompletionTokens, modelID) {
        this.modelName = modelName;
        this.maxCompletionTokens = maxCompletionTokens;
        this.id = modelID;
    }

    static _getAllModels() {
        return [
            GroqModel.LLAMA_31_8B_INSTANT,
            GroqModel.LLAMA_33_70B,
            GroqModel.META_LLAMA,
            GroqModel.GPT_OSS_120B,
            GroqModel.GPT_OSS_20B,
            GroqModel.GROQ_COMPOUND,
        ];
    }

    static publicList(model) {
        return GroqModel._getAllModels().map(model => ({
            name: model.modelName,
            id: model.id,
        }));
    }

    static getModelById(id) {
        const model = GroqModel._getAllModels().find(m => m.id === id);
        if (!model)
            return GroqModel.LLAMA_31_8B_INSTANT;
        return model;
    }
}