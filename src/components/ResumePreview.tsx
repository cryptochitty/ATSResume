import React from 'react';
import { ResumeData } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';
import { Linkedin, Github } from 'lucide-react';

interface ResumePreviewProps {
  resume: ResumeData;
}

export default function ResumePreview({ resume }: ResumePreviewProps) {
  return (
    <div id="resume-preview" className="bg-white shadow-2xl w-full aspect-[1/1.41] p-12 text-[11pt] font-sans text-neutral-900 overflow-hidden print:shadow-none print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #resume-preview, #resume-preview * { visibility: visible; }
          #resume-preview { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
      
      {/* Header */}
      <header className="text-center space-y-2 mb-8 border-b-2 border-neutral-900 pb-6">
        <h1 className="text-3xl font-bold uppercase tracking-tight">{resume.personalInfo.fullName}</h1>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-neutral-600">
          {resume.personalInfo.location && <span>{resume.personalInfo.location}</span>}
          {resume.personalInfo.phone && <span>{resume.personalInfo.phone}</span>}
          {resume.personalInfo.email && <span>{resume.personalInfo.email}</span>}
          {resume.personalInfo.linkedin && (
            <span className="flex items-center gap-1">
              <Linkedin className="w-3 h-3" />
              {resume.personalInfo.linkedin.replace(/^https?:\/\/(www\.)?/, '')}
            </span>
          )}
          {resume.personalInfo.github && (
            <span className="flex items-center gap-1">
              <Github className="w-3 h-3" />
              {resume.personalInfo.github.replace(/^https?:\/\/(www\.)?/, '')}
            </span>
          )}
        </div>
      </header>

      {/* Summary */}
      {resume.summary && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-neutral-200 mb-3 pb-1">Professional Summary</h2>
          <p className="text-sm leading-relaxed text-neutral-700">{resume.summary}</p>
        </section>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-neutral-200 mb-4 pb-1">Professional Experience</h2>
          <div className="space-y-6">
            {resume.experience.map((exp) => (
              <div key={exp.id} className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-base">{exp.company}</h3>
                  <span className="text-xs font-medium text-neutral-500">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                </div>
                <div className="flex justify-between items-baseline italic text-sm text-neutral-600">
                  <span>{exp.role}</span>
                  <span>{exp.location}</span>
                </div>
                <div className="text-sm text-neutral-700 prose prose-sm max-w-none">
                  <ReactMarkdown>{exp.description}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-neutral-200 mb-3 pb-1">Technical Skills</h2>
          <div className="space-y-2">
            {resume.skills.map((skill, index) => (
              <div key={index} className="text-sm">
                <span className="font-bold">{skill.category}: </span>
                <span className="text-neutral-700">{skill.items.join(', ')}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-neutral-200 mb-4 pb-1">Education</h2>
          <div className="space-y-4">
            {resume.education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline">
                <div>
                  <h3 className="font-bold text-sm">{edu.school}</h3>
                  <p className="text-sm text-neutral-600 italic">{edu.degree} in {edu.field}</p>
                </div>
                <span className="text-xs font-medium text-neutral-500">{edu.startDate} — {edu.endDate}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-neutral-200 mb-4 pb-1">Projects</h2>
          <div className="space-y-4">
            {resume.projects.map((project) => (
              <div key={project.id} className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-sm">{project.name}</h3>
                  {project.link && <span className="text-xs text-neutral-500">{project.link}</span>}
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed">{project.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
