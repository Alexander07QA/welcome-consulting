import { create } from 'zustand';
import type { Emotion } from '../types';
import { avatarController } from '../avatar/rig';

export type Activity = 'reposo' | 'escuchando' | 'pensando' | 'hablando' | 'respirando';

interface AvatarStore {
  activity: Activity;
  emotion: Emotion;
  setActivity(a: Activity): void;
  setEmotion(e: Emotion): void;
}

export const useAvatarStore = create<AvatarStore>((set) => ({
  activity: 'reposo',
  emotion: 'calma',
  setActivity: (activity) => {
    if (activity === 'escuchando') avatarController.setEmotion('escucha');
    if (activity === 'pensando') avatarController.setEmotion('reflexion');
    set({ activity });
  },
  setEmotion: (emotion) => {
    avatarController.setEmotion(emotion);
    set({ emotion });
  },
}));
