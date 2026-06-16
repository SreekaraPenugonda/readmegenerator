import { Schema, model } from 'mongoose';

// The TypeScript rule map for our data
interface IReadme {
  projectPath: string;
  markdownContent: string;
  createdAt: Date;
}

// The MongoDB blueprint map for our data
const ReadmeSchema = new Schema<IReadme>({
  projectPath: { type: String, required: true },
  markdownContent: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Readme = model<IReadme>('Readme', ReadmeSchema);
