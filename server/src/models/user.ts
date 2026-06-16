import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  githubUsername?: string;
  theme?: 'light' | 'dark';
  fontSize?: 'small' | 'medium' | 'large';
  fontFamily?: 'Inter' | 'Roboto' | 'Monospace' | 'Serif';
  favorites: string[];
  otp?: string;
  otpExpires?: Date;
  otpAttempts?: number;
  otpLastAttempt?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String },
  githubUsername: { type: String },
  theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  fontFamily: { type: String, enum: ['Inter', 'Roboto', 'Monospace', 'Serif'], default: 'Inter' },
  favorites: [{ type: String }],
  otp: { type: String },
  otpExpires: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  otpLastAttempt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);