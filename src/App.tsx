// Build version: 1.0.2 - Updated for Redirect Auth
import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout, db, ResumeData, OperationType, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { FileText, Plus, LogOut, User as UserIcon, Sparkles, Download, Layout, CreditCard, Github, Linkedin, Globe, Phone, Mail, MapPin, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ResumeForm from '@/components/ResumeForm';
import ResumePreview from '@/components/ResumePreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [activeResume, setActiveResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const q = query(collection(db, 'resumes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResumeData));
      setResumes(data);
      
      if (activeResume) {
        const updated = data.find(r => r.id === activeResume.id);
        if (updated) setActiveResume(updated);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'resumes');
    });

    return () => unsubscribe();
  }, [user, isAuthReady, activeResume?.id]);

  const createNewResume = async () => {
    if (!user) return;
    const newResume: ResumeData = {
      userId: user.uid,
      title: 'Untitled Resume',
      personalInfo: {
        fullName: user.displayName || '',
        email: user.email || '',
        phone: '',
        location: '',
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      isPaid: false,
      updatedAt: Timestamp.now(),
    };

    try {
      const newDocRef = doc(collection(db, 'resumes'));
      await setDoc(newDocRef, newResume);
      setActiveResume({ ...newResume, id: newDocRef.id });
      toast.success('New resume created!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'resumes');
    }
  };

  const handlePurchaseResume = async () => {
    if (!activeResume || !user) return;
    
    setIsProcessingPayment(true);
    
    setTimeout(async () => {
      try {
        // Mocking payment verification
        if (activeResume.id) {
          await updateDoc(doc(db, 'resumes', activeResume.id), {
            isPaid: true,
            updatedAt: Timestamp.now()
          });
          toast.success('Resume unlocked! You can now download it.');
          setShowPayModal(false);
        }
      } catch (error) {
        toast.error('Payment verification failed');
      } finally {
        setIsProcessingPayment(false);
      }
    }, 2000);
  };

  const handleDownloadClick = () => {
    if (activeResume?.isPaid) {
      window.print();
    } else {
      setShowPayModal(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900">ResumeAI</h1>
            <p className="text-neutral-500">Build ATS-optimized resumes for Play Store & App Store.</p>
          </div>
          
          <Card className="border-none shadow-xl bg-white">
            <CardContent className="pt-6 space-y-4">
              <Button onClick={signInWithGoogle} className="w-full h-12 text-lg font-medium" size="lg">
                <Globe className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
              <p className="text-xs text-neutral-400">
                Secure authentication via Firebase Redirect
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-neutral-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg tracking-tight">ResumeAI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={createNewResume}>
          <Plus className="w-5 h-5" />
        </Button>
      </header>

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl tracking-tight">ResumeAI</span>
          </div>
          
          <Button onClick={createNewResume} className="w-full justify-start gap-2 mb-6" variant="default">
            <Plus className="w-4 h-4" />
            New Resume
          </Button>

          <nav className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-2">My Resumes</p>
            <ScrollArea className="h-[calc(100vh-300px)]">
              {resumes.map((resume) => (
                <button
                  key={resume.id}
                  onClick={() => setActiveResume(resume)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    activeResume?.id === resume.id 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="truncate">{resume.title}</span>
                  {resume.isPaid && <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />}
                </button>
              ))}
            </ScrollArea>
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden">
              <img src={user.photoURL || ''} alt={user.displayName || ''} referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <button onClick={logout} className="text-xs text-neutral-500 hover:text-red-500 flex items-center gap-1">
                <LogOut className="w-3 h-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {activeResume ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">{activeResume.title}</h2>
                    {activeResume.isPaid ? (
                      <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Unlocked
                      </span>
                    ) : (
                      <span className="bg-neutral-100 text-neutral-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Preview Only
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant={activeResume.isPaid ? "outline" : "default"} size="sm" onClick={handleDownloadClick}>
                      {activeResume.isPaid ? <Download className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                      {activeResume.isPaid ? 'Export PDF' : 'Unlock PDF (₹20)'}
                    </Button>
                  </div>
                </div>
                
                <ResumeForm 
                  resume={activeResume} 
                  onChange={(updated) => {
                    setActiveResume(updated);
                  }} 
                />
              </div>
            </div>
            
            {/* Live Preview */}
            <div className="w-full lg:w-[500px] bg-neutral-200/50 p-4 md:p-8 overflow-y-auto border-l border-neutral-200">
              <div className="sticky top-0">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layout className="w-3 h-3" />
                  Live ATS Preview
                </p>
                <div className="relative">
                  <ResumePreview resume={activeResume} />
                  {!activeResume.isPaid && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center p-8 text-center">
                      <div className="bg-white p-6 rounded-xl shadow-xl border border-neutral-100 max-w-xs">
                        <Lock className="w-8 h-8 text-neutral-400 mx-auto mb-4" />
                        <h3 className="font-bold text-neutral-900 mb-2">Preview Mode</h3>
                        <p className="text-sm text-neutral-500 mb-4">Unlock this resume for ₹20 to download the ATS-optimized PDF.</p>
                        <Button onClick={() => setShowPayModal(true)} className="w-full">Unlock Now</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-neutral-300" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No resume selected</h2>
            <p className="text-neutral-500 mb-8 max-w-sm">Select a resume from the sidebar or create a new one to get started.</p>
            <Button onClick={createNewResume} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Create New Resume
            </Button>
          </div>
        )}
      </main>

      {/* Payment Modal */}
      <Dialog open={showPayModal} onOpenChange={setShowPayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Unlock Professional PDF
            </DialogTitle>
            <DialogDescription>
              Get lifetime access to download and edit this resume in ATS-optimized PDF format.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Resume Unlock</span>
              <span className="font-bold text-xl">₹20.00</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                ATS-Optimized Formatting
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Google Gemini AI Rewriting
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Lifetime Access for this Resume
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button 
              type="button" 
              className="w-full h-12 text-lg" 
              onClick={handlePurchaseResume}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Processing...
                </>
              ) : (
                'Pay with Google Play / App Store'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </div>
  );
}
