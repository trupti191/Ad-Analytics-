export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  portfolio?: string;
  summary: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  achievements: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  graduationDate: string;
  gpa?: string;
  achievements: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  achievements: string[];
}

export interface Skill {
  category: string;
  items: string[];
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
}

export interface ATSScore {
  overall: number;
  breakdown: {
    formatting: number;
    keywords: number;
    experience: number;
    education: number;
    skills: number;
  };
  suggestions: string[];
}

export interface ImprovementSuggestion {
  section: string;
  type: 'critical' | 'important' | 'suggestion';
  message: string;
  original?: string;
  improved?: string;
}

export type TemplateType = 'professional' | 'modern' | 'technical';
