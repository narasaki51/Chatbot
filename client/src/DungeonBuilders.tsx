import React from 'react';
import { Hammer, HelpCircle } from 'lucide-react';

export interface BuilderTrait {
  label: string;
  value: string;
  color: string;
}

export interface Builder {
  id: string;
  name: string;
  title: string;
  description: string;
  isLocked: boolean;
  icon: React.ReactNode;
  color: string;
  traits: BuilderTrait[];
}

export const BUILDERS: Builder[] = [
  {
    id: 'architect',
    name: '아키텍트',
    title: '균형 잡힌 설계자',
    description: '가장 표준적인 던전 설계를 지원합니다. 초보부터 숙련자까지 모두에게 적합한 범용적인 빌더입니다.',
    isLocked: false,
    icon: <Hammer size={32} />,
    color: '#6366f1',
    traits: [
      { label: '건설 비용', value: '표준', color: '#94a3b8' },
      { label: '함정 위력', value: '보통', color: '#94a3b8' },
      { label: '몬스터 수급', value: '원활', color: '#00ffa3' }
    ]
  },
  {
    id: 'locked_1',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  },
  {
    id: 'locked_2',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  },
  {
    id: 'locked_3',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  },
  {
    id: 'locked_4',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  },
  {
    id: 'locked_5',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  },
  {
    id: 'locked_6',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  },
  {
    id: 'locked_7',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  },
  {
    id: 'locked_8',
    name: '???',
    title: '잠금됨',
    description: '새로운 던전 빌더가 곧 합류할 예정입니다.',
    isLocked: true,
    icon: <HelpCircle size={32} />,
    color: '#333',
    traits: []
  }
];
