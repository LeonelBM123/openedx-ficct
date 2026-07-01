import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@openedx/paragon';

const BASE = process.env.PUBLIC_PATH || '/';

export const AVATAR_LIST = [
  {
    id: 'default', label: 'Avatar', path: `${BASE}avatar.glb`, emoji: '🧑', voice: 'es-MX-JorgeNeural',
  },
  {
    id: 'avatar1', label: 'Avatar', path: `${BASE}avatar-1.glb`, emoji: '🧑', voice: 'es-MX-JorgeNeural',
  },
  {
    id: 'avatar2', label: 'Avatar', path: `${BASE}avatar-2.glb`, emoji: '🧑', voice: 'es-MX-JorgeNeural',
  },
  {
    id: 'avatar3', label: 'Avatar', path: `${BASE}avatar-3.glb`, emoji: '🧑', voice: 'es-MX-JorgeNeural',
  },
  {
    id: 'avatar4', label: 'Avatar', path: `${BASE}avatar-4 (1).glb`, emoji: '👩', voice: 'es-MX-DaliaNeural',
  },
  {
    id: 'avatar6', label: 'Avatar', path: `${BASE}avatar-6.glb`, emoji: '👩', voice: 'es-MX-DaliaNeural',
  },
];

const AvatarSwitcher = ({ selectedId, onSelect }) => (
  <div className="avatar-switcher d-flex gap-2 flex-wrap">
    {AVATAR_LIST.map((avatar) => (
      <Button
        key={avatar.id}
        size="sm"
        variant={selectedId === avatar.id ? 'primary' : 'tertiary'}
        onClick={() => onSelect(avatar.id)}
      >
        {avatar.emoji}
      </Button>
    ))}
  </div>
);

AvatarSwitcher.propTypes = {
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default AvatarSwitcher;
