import { ResumeData, ATSScore, ImprovementSuggestion } from '@/types/resume';

const PM_KEYWORDS = [
  'product management', 'roadmap', 'stakeholder', 'agile', 'scrum',
  'user stories', 'backlog', 'sprint', 'metrics', 'analytics',
  'user research', 'wireframes', 'prototyping', 'A/B testing',
  'product strategy', 'market research', 'competitive analysis',
  'cross-functional', 'data-driven', 'KPIs', 'OKRs', 'MVP',
  'product lifecycle', 'feature prioritization', 'user experience',
  'product vision', 'go-to-market', 'customer feedback'
];

const ACTION_VERBS = [
  'led', 'managed', 'developed', 'implemented', 'launched',
  'increased', 'decreased', 'improved', 'optimized', 'created',
  'designed', 'analyzed', 'coordinated', 'facilitated', 'drove',
  'established', 'executed', 'delivered', 'achieved', 'spearheaded',
  'collaborated', 'streamlined', 'enhanced', 'built', 'scaled'
];

export function calculateATSScore(resumeData: ResumeData): ATSScore {
  const scores = {
    formatting: calculateFormattingScore(resumeData),
    keywords: calculateKeywordScore(resumeData),
    experience: calculateExperienceScore(resumeData),
    education: calculateEducationScore(resumeData),
    skills: calculateSkillsScore(resumeData),
  };

  const overall = Math.round(
    (scores.formatting * 0.2 +
      scores.keywords * 0.3 +
      scores.experience * 0.25 +
      scores.education * 0.15 +
      scores.skills * 0.1)
  );

  const suggestions = generateSuggestions(resumeData, scores);

  return {
    overall,
    breakdown: scores,
    suggestions,
  };
}

function calculateFormattingScore(resumeData: ResumeData): number {
  let score = 100;
  
  if (!resumeData.personalInfo.fullName) score -= 20;
  if (!resumeData.personalInfo.email) score -= 20;
  if (!resumeData.personalInfo.phone) score -= 10;
  if (!resumeData.personalInfo.summary) score -= 15;
  
  return Math.max(0, score);
}

function calculateKeywordScore(resumeData: ResumeData): number {
  const allText = JSON.stringify(resumeData).toLowerCase();
  const foundKeywords = PM_KEYWORDS.filter(keyword => 
    allText.includes(keyword.toLowerCase())
  );
  
  return Math.min(100, (foundKeywords.length / PM_KEYWORDS.length) * 200);
}

function calculateExperienceScore(resumeData: ResumeData): number {
  if (resumeData.experience.length === 0) return 0;
  
  let score = 50;
  
  resumeData.experience.forEach(exp => {
    if (exp.achievements.length >= 3) score += 10;
    
    const hasQuantifiableResults = exp.achievements.some(achievement =>
      /\d+/.test(achievement)
    );
    if (hasQuantifiableResults) score += 10;
    
    const hasActionVerbs = exp.achievements.some(achievement =>
      ACTION_VERBS.some(verb => 
        achievement.toLowerCase().startsWith(verb)
      )
    );
    if (hasActionVerbs) score += 10;
  });
  
  return Math.min(100, score);
}

function calculateEducationScore(resumeData: ResumeData): number {
  if (resumeData.education.length === 0) return 0;
  
  let score = 70;
  
  resumeData.education.forEach(edu => {
    if (edu.gpa && parseFloat(edu.gpa) >= 3.5) score += 15;
    if (edu.achievements.length > 0) score += 15;
  });
  
  return Math.min(100, score);
}

function calculateSkillsScore(resumeData: ResumeData): number {
  if (resumeData.skills.length === 0) return 0;
  
  const totalSkills = resumeData.skills.reduce(
    (sum, category) => sum + category.items.length,
    0
  );
  
  return Math.min(100, totalSkills * 10);
}

function generateSuggestions(
  resumeData: ResumeData,
  scores: ATSScore['breakdown']
): string[] {
  const suggestions: string[] = [];
  
  if (scores.formatting < 80) {
    if (!resumeData.personalInfo.summary) {
      suggestions.push('Add a professional summary highlighting your PM aspirations and key strengths');
    }
    if (!resumeData.personalInfo.linkedin) {
      suggestions.push('Include your LinkedIn profile URL');
    }
  }
  
  if (scores.keywords < 70) {
    suggestions.push('Include more PM-specific keywords like "roadmap", "stakeholder management", "agile", "user research"');
    suggestions.push('Add metrics and data-driven achievements to demonstrate impact');
  }
  
  if (scores.experience < 70) {
    suggestions.push('Start each achievement with strong action verbs (Led, Managed, Developed, etc.)');
    suggestions.push('Include quantifiable results (e.g., "Increased user engagement by 25%")');
    suggestions.push('Add at least 3-4 achievements per role');
  }
  
  if (scores.skills < 70) {
    suggestions.push('Add more relevant skills: Product Analytics, SQL, Jira, Figma, User Research');
  }
  
  if (resumeData.projects.length === 0) {
    suggestions.push('Add personal projects or case studies to demonstrate PM skills');
  }
  
  return suggestions;
}

export function analyzeResume(resumeData: ResumeData): ImprovementSuggestion[] {
  const improvements: ImprovementSuggestion[] = [];
  
  if (resumeData.personalInfo.summary.length < 100) {
    improvements.push({
      section: 'Summary',
      type: 'important',
      message: 'Your summary is too brief. Expand it to 2-3 sentences highlighting your PM skills and career goals.',
      original: resumeData.personalInfo.summary,
      improved: 'Entry-level Product Manager with strong analytical skills and passion for building user-centric products. Experienced in conducting user research, analyzing data, and collaborating with cross-functional teams. Seeking to leverage technical background and business acumen to drive product success.'
    });
  }
  
  resumeData.experience.forEach((exp, index) => {
    exp.achievements.forEach((achievement, achIndex) => {
      if (!/^\s*(led|managed|developed|implemented|launched|increased|decreased|improved|optimized|created|designed|analyzed|coordinated|facilitated|drove)/i.test(achievement)) {
        improvements.push({
          section: `Experience - ${exp.company}`,
          type: 'suggestion',
          message: `Achievement ${achIndex + 1} should start with a strong action verb`,
          original: achievement,
          improved: `Led ${achievement.toLowerCase()}`
        });
      }
      
      if (!/\d+/.test(achievement)) {
        improvements.push({
          section: `Experience - ${exp.company}`,
          type: 'important',
          message: `Achievement ${achIndex + 1} lacks quantifiable metrics`,
          original: achievement,
        });
      }
    });
  });
  
  return improvements;
}

export function getPMKeywordSuggestions(currentText: string): string[] {
  const lowerText = currentText.toLowerCase();
  const missingKeywords = PM_KEYWORDS.filter(
    keyword => !lowerText.includes(keyword.toLowerCase())
  );
  
  return missingKeywords.slice(0, 10);
}
