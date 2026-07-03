export default class GroqModel {
  static GPT_OSS_120B = new GroqModel("openai/gpt-oss-120b", 8192, 1, {
    tools: [
      {
        type: "browser_search",
      },
    ],
  });

  static GPT_OSS_20B = new GroqModel("openai/gpt-oss-20b", 8192, 2, {
    tools: [
      {
        type: "browser_search",
      },
    ],
  });

  static GROQ_COMPOUND = new GroqModel("groq/compound", 1024, 3, {
    compound_custom: {
      tools: {
        enabled_tools: ["web_search"],
      },
    },
  });

  constructor(modelName, maxCompletionTokens, modelID, webSearch) {
    this.modelName = modelName;
    this.maxCompletionTokens = maxCompletionTokens;
    this.id = modelID;
    this.searchWeb = webSearch;
  }

  static _getAllModels() {
    return [
      GroqModel.META_LLAMA,
      GroqModel.GPT_OSS_120B,
      GroqModel.GPT_OSS_20B,
      GroqModel.GROQ_COMPOUND,
    ];
  }

  static publicList(model) {
    return GroqModel._getAllModels().map((model) => ({
      name: model.modelName,
      id: model.id,
    }));
  }

  static getModelById(id) {
    const model = GroqModel._getAllModels().find((m) => m.id === id);
    if (!model) return GroqModel.LLAMA_31_8B_INSTANT;
    return model;
  }
}
