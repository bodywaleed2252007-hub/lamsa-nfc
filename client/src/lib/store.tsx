import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SocialLink = {
  platform: 'instagram' | 'tiktok' | 'facebook' | 'whatsapp' | 'snapchat' | 'youtube' | 'linkedin' | 'website' | 'menu' | 'location' | 'call';
  url: string;
  handle: string;
};

export type ProfileData = {
  name: string;
  bio: string;
  avatarUrl: string;
  links: SocialLink[];
  theme: string;
  customDomain: string;
};

interface ProfileContextType {
  profile: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => void;
  addLink: (link: SocialLink) => void;
  removeLink: (index: number) => void;
  updateLink: (index: number, link: SocialLink) => void;
}

const defaultProfile: ProfileData = {
  name: "Your Name",
  bio: "Digital Creator",
  avatarUrl: "https://github.com/shadcn.png",
  theme: "glass",
  customDomain: "",
  links: [
    { platform: 'instagram', url: '', handle: '@username' },
  ]
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);

  const updateProfile = (data: Partial<ProfileData>) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  const addLink = (link: SocialLink) => {
    setProfile(prev => ({ ...prev, links: [...prev.links, link] }));
  };

  const removeLink = (index: number) => {
    setProfile(prev => ({ 
      ...prev, 
      links: prev.links.filter((_, i) => i !== index) 
    }));
  };

  const updateLink = (index: number, link: SocialLink) => {
    setProfile(prev => {
      const newLinks = [...prev.links];
      newLinks[index] = link;
      return { ...prev, links: newLinks };
    });
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, addLink, removeLink, updateLink }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
