import React from 'react';
import {CHAPTER_ICONS} from '../lib/chapter-icons';
export default function ChapterIcon({chapter}){
 const Icon=CHAPTER_ICONS[chapter];
 return <Icon aria-hidden="true" data-chapter-icon={chapter} className="chapter-title-icon" size={24}/>;
}
