// src/@types/express/index.d.ts

declare module 'express' {
  export interface Request {
    user?: {
      id: number;
      username: string;
      userType: string; // or string if not explicitly defined in your model
    };
  }
}
