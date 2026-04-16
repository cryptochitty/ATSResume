import React from 'react';
import { ResumeData, db, OperationType, handleFirestoreError } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Sparkles, Loader2, Github, Linkedin, Import } from 'lucide-react';
import { rewriteExperience, generateSummary, parseProfileData } from '@/services/geminiService';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface ResumeFormProps {
  resume: ResumeData;
  onChange: (resume: ResumeData) => void;
}

export default function ResumeForm({ resume, onChange }: ResumeFormProps) {
  const [isRewriting, setIsRewriting] = React.useState<string | null>(null);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [isImporting, setIsImporting] = React.useState(false);

  const updateResume = async (updates: Partial<ResumeData>) => {
    const updated = { ...resume, ...updates, updatedAt: Timestamp.now() };
    onChange(updated);
    if (resume.id) {
      try {
        await updateDoc(doc(db, 'resumes', resume.id), { ...updates, updatedAt: Timestamp.now() });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `resumes/${resume.id}`);
      }
    }
  };

  const handlePersonalInfoChange = (field: keyof ResumeData['personalInfo'], value: string) => {
    updateResume({
      personalInfo: { ...resume.personalInfo, [field]: value }
    });
  };

  const handleImportProfile = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    try {
      const parsedData = await parseProfileData(importText);
      if (parsedData) {
        // Merge parsed data with existing resume
        const updates: Partial<ResumeData> = {
          personalInfo: {
            ...resume.personalInfo,
            ...parsedData.personalInfo
          },
          summary: parsedData.summary || resume.summary,
          experience: [
            ...resume.experience,
            ...(parsedData.experience || []).map((e: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              ...e,
              bullets: []
            }))
          ],
          education: [
            ...resume.education,
            ...(parsedData.education || []).map((e: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              ...e
            }))
          ],
          skills: [
            ...resume.skills,
            ...(parsedData.skills || [])
          ],
          projects: [
            ...resume.projects,
            ...(parsedData.projects || []).map((p: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              ...p,
              bullets: []
            }))
          ]
        };
        await updateResume(updates);
        toast.success('Profile data imported successfully!');
        setShowImportModal(false);
        setImportText('');
      }
    } catch (error) {
      toast.error('Failed to parse profile data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAIImproveExperience = async (id: string) => {
    const exp = resume.experience.find(e => e.id === id);
    if (!exp) return;

    setIsRewriting(id);
    try {
      const improved = await rewriteExperience(exp.description, exp.role);
      const updatedExperience = resume.experience.map(e => 
        e.id === id ? { ...e, description: improved } : e
      );
      updateResume({ experience: updatedExperience });
      toast.success('Experience improved with AI!');
    } catch (error) {
      toast.error('Failed to improve experience');
    } finally {
      setIsRewriting(null);
    }
  };

  const handleAIGenerateSummary = async () => {
    setIsRewriting('summary');
    try {
      const expText = resume.experience.map(e => `${e.role} at ${e.company}`).join(', ');
      const skillsText = resume.skills.map(s => s.items.join(', ')).join(', ');
      const summary = await generateSummary(expText, skillsText);
      updateResume({ summary });
      toast.success('Summary generated with AI!');
    } catch (error) {
      toast.error('Failed to generate summary');
    } finally {
      setIsRewriting(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setShowImportModal(true)}
        >
          <Import className="w-4 h-4" />
          Import from LinkedIn/GitHub
        </Button>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                value={resume.personalInfo.fullName} 
                onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)} 
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={resume.personalInfo.email} 
                onChange={(e) => handlePersonalInfoChange('email', e.target.value)} 
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={resume.personalInfo.phone} 
                onChange={(e) => handlePersonalInfoChange('phone', e.target.value)} 
                placeholder="+1 234 567 890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                value={resume.personalInfo.location} 
                onChange={(e) => handlePersonalInfoChange('location', e.target.value)} 
                placeholder="New York, NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="w-3 h-3" />
                LinkedIn URL
              </Label>
              <Input 
                id="linkedin" 
                value={resume.personalInfo.linkedin || ''} 
                onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)} 
                placeholder="linkedin.com/in/username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github" className="flex items-center gap-2">
                <Github className="w-3 h-3" />
                GitHub URL
              </Label>
              <Input 
                id="github" 
                value={resume.personalInfo.github || ''} 
                onChange={(e) => handlePersonalInfoChange('github', e.target.value)} 
                placeholder="github.com/username"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="summary">Professional Summary</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary hover:text-primary hover:bg-primary/10"
                onClick={handleAIGenerateSummary}
                disabled={isRewriting === 'summary'}
              >
                {isRewriting === 'summary' ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                AI Generate
              </Button>
            </div>
            <Textarea 
              id="summary" 
              value={resume.summary} 
              onChange={(e) => updateResume({ summary: e.target.value })} 
              placeholder="Briefly describe your professional background and goals..."
              className="h-32"
            />
          </div>
        </TabsContent>

        <TabsContent value="experience" className="mt-6 space-y-6">
          {resume.experience.map((exp, index) => (
            <Card key={exp.id} className="relative group">
              <CardContent className="pt-6 space-y-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const updated = resume.experience.filter(e => e.id !== exp.id);
                    updateResume({ experience: updated });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input 
                      value={exp.company} 
                      onChange={(e) => {
                        const updated = resume.experience.map(item => item.id === exp.id ? { ...item, company: e.target.value } : item);
                        updateResume({ experience: updated });
                      }} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input 
                      value={exp.role} 
                      onChange={(e) => {
                        const updated = resume.experience.map(item => item.id === exp.id ? { ...item, role: e.target.value } : item);
                        updateResume({ experience: updated });
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Description</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => handleAIImproveExperience(exp.id)}
                      disabled={isRewriting === exp.id}
                    >
                      {isRewriting === exp.id ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                      AI Improve (Google XYZ)
                    </Button>
                  </div>
                  <Textarea 
                    value={exp.description} 
                    onChange={(e) => {
                      const updated = resume.experience.map(item => item.id === exp.id ? { ...item, description: e.target.value } : item);
                      updateResume({ experience: updated });
                    }} 
                    className="h-24"
                    placeholder="Describe your achievements..."
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Button 
            variant="outline" 
            className="w-full border-dashed" 
            onClick={() => {
              const newExp = {
                id: Math.random().toString(36).substr(2, 9),
                company: '',
                role: '',
                location: '',
                startDate: '',
                endDate: '',
                current: false,
                description: '',
                bullets: []
              };
              updateResume({ experience: [...resume.experience, newExp] });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Experience
          </Button>
        </TabsContent>

        <TabsContent value="education" className="mt-6 space-y-6">
          {resume.education.map((edu) => (
            <Card key={edu.id} className="relative group">
              <CardContent className="pt-6 space-y-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const updated = resume.education.filter(e => e.id !== edu.id);
                    updateResume({ education: updated });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>School / University</Label>
                    <Input 
                      value={edu.school} 
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, school: e.target.value } : item);
                        updateResume({ education: updated });
                      }} 
                      placeholder="Harvard University"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Degree</Label>
                    <Input 
                      value={edu.degree} 
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, degree: e.target.value } : item);
                        updateResume({ education: updated });
                      }} 
                      placeholder="Bachelor of Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Field of Study</Label>
                    <Input 
                      value={edu.field} 
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, field: e.target.value } : item);
                        updateResume({ education: updated });
                      }} 
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input 
                      value={edu.location} 
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, location: e.target.value } : item);
                        updateResume({ education: updated });
                      }} 
                      placeholder="Cambridge, MA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      value={edu.startDate} 
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, startDate: e.target.value } : item);
                        updateResume({ education: updated });
                      }} 
                      placeholder="Sep 2018"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (or Expected)</Label>
                    <Input 
                      value={edu.endDate} 
                      onChange={(e) => {
                        const updated = resume.education.map(item => item.id === edu.id ? { ...item, endDate: e.target.value } : item);
                        updateResume({ education: updated });
                      }} 
                      placeholder="May 2022"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button 
            variant="outline" 
            className="w-full border-dashed" 
            onClick={() => {
              const newEdu = {
                id: Math.random().toString(36).substr(2, 9),
                school: '',
                degree: '',
                field: '',
                location: '',
                startDate: '',
                endDate: ''
              };
              updateResume({ education: [...resume.education, newEdu] });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Education
          </Button>
        </TabsContent>

        <TabsContent value="skills" className="mt-6 space-y-6">
          {resume.skills.map((skill, index) => (
            <Card key={index}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Input 
                    value={skill.category} 
                    onChange={(e) => {
                      const updated = resume.skills.map((s, i) => i === index ? { ...s, category: e.target.value } : s);
                      updateResume({ skills: updated });
                    }} 
                    className="w-1/3 font-semibold"
                    placeholder="Category (e.g. Languages)"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      const updated = resume.skills.filter((_, i) => i !== index);
                      updateResume({ skills: updated });
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <Input 
                  value={skill.items.join(', ')} 
                  onChange={(e) => {
                    const items = e.target.value.split(',').map(i => i.trim());
                    const updated = resume.skills.map((s, i) => i === index ? { ...s, items } : s);
                    updateResume({ skills: updated });
                  }} 
                  placeholder="React, TypeScript, Node.js..."
                />
              </CardContent>
            </Card>
          ))}
          <Button 
            variant="outline" 
            className="w-full border-dashed" 
            onClick={() => {
              updateResume({ skills: [...resume.skills, { category: '', items: [] }] });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Skill Category
          </Button>
        </TabsContent>
        <TabsContent value="projects" className="mt-6 space-y-6">
          {resume.projects.map((project) => (
            <Card key={project.id} className="relative group">
              <CardContent className="pt-6 space-y-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const updated = resume.projects.filter(p => p.id !== project.id);
                    updateResume({ projects: updated });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input 
                      value={project.name} 
                      onChange={(e) => {
                        const updated = resume.projects.map(item => item.id === project.id ? { ...item, name: e.target.value } : item);
                        updateResume({ projects: updated });
                      }} 
                      placeholder="E-commerce Platform"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Project Link (Optional)</Label>
                    <Input 
                      value={project.link || ''} 
                      onChange={(e) => {
                        const updated = resume.projects.map(item => item.id === project.id ? { ...item, link: e.target.value } : item);
                        updateResume({ projects: updated });
                      }} 
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={project.description} 
                      onChange={(e) => {
                        const updated = resume.projects.map(item => item.id === project.id ? { ...item, description: e.target.value } : item);
                        updateResume({ projects: updated });
                      }} 
                      placeholder="Describe the project and your role..."
                      className="h-24"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button 
            variant="outline" 
            className="w-full border-dashed" 
            onClick={() => {
              const newProject = {
                id: Math.random().toString(36).substr(2, 9),
                name: '',
                description: '',
                link: '',
                bullets: []
              };
              updateResume({ projects: [...resume.projects, newProject] });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </TabsContent>
      </Tabs>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Import className="w-5 h-5 text-primary" />
              Import Profile Data
            </DialogTitle>
            <DialogDescription>
              Paste your LinkedIn profile text, GitHub bio, or any professional summary. Our AI will extract experience, education, and skills.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea 
              placeholder="Paste LinkedIn profile content or GitHub bio here..." 
              className="h-64 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span>Tip: You can copy-paste your entire LinkedIn "About" section or "Experience" list.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
            <Button 
              onClick={handleImportProfile} 
              disabled={isImporting || !importText.trim()}
              className="min-w-[120px]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                'Extract Data'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
