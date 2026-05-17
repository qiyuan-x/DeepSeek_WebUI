import { Request, Response, NextFunction } from 'express';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract API key from body or headers
  let apiKey = req.body.apiKey;
  if (!apiKey && req.headers['x-deepseek-api-key']) {
    apiKey = req.headers['x-deepseek-api-key'] as string;
  }
  if (!apiKey && req.query.apiKey) {
    apiKey = req.query.apiKey as string;
  }
  
  if (!apiKey) {
    return res.status(403).json({ error: "请先在设置中配置 API Key" });
  }

  // Store it in res.locals for downstream use
  res.locals.apiKey = apiKey;
  next();
};
