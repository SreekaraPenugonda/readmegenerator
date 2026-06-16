import { Schema, model, Document } from 'mongoose';

export interface IReadme extends Document {
  projectPath: string;
  markdownContent: string;
  createdAt: Date;
  userId?: string;
  configOptions: string[];
  version: number;
  isFavorite: boolean;
}

const ReadmeSchema = new Schema<IReadme>({
  projectPath: { type: String, required: true },
  markdownContent: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  userId: { type: String, index: true },
  configOptions: [{ type: String }],
  version: { type: Number, default: 1 },
  isFavorite: { type: Boolean, default: false },
});

export const Readme = model<IReadme>('Readme', ReadmeSchema);