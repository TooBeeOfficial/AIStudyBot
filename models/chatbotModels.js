export default class AIModel {

  static Gemma_31B = new AIModel("gemma-4-31b", 8192, 1);
  static OpenAi_GPT_OSS = new AIModel("gpt-oss-120b", 8192, 2);

  constructor(modelName, maxCompletionTokens, modelID) {
    this.modelName = modelName;
    this.maxCompletionTokens = maxCompletionTokens;
    this.id = modelID;
  }

  static _getAllModels() {
    return [
      AIModel.Gemma_31B,
      AIModel.OpenAi_GPT_OSS,
    ];
  }

  static publicList(model) {
    return AIModel._getAllModels().map((model) => ({
      name: model.modelName,
      id: model.id,
    }));
  }

  static getModelById(id) {
    const model = AIModel._getAllModels().find((m) => m.id === id);
    if (!model) return AIModel.LLAMA_31_8B_INSTANT;
    return model;
  }
}
