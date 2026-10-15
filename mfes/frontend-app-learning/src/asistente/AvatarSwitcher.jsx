import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@openedx/paragon';
import { UserIcon } from './Icons';

const BASE = process.env.PUBLIC_PATH || '/';
// Los .glb se sirven con Cache-Control immutable (ver tutor-plugins/avatar_asistente.py):
// subir este numero al reemplazar un modelo para que los navegadores lo vuelvan a bajar.
const ASSET_VERSION = 2;

export const AVATAR_LIST = [
  {
    id: 'default', label: 'Avatar', path: `${BASE}avatar.glb?v=${ASSET_VERSION}`, emoji: '🧑', voice: 'alex',
  },
  {
    id: 'avatar1', label: 'Avatar', path: `${BASE}avatar-1.glb?v=${ASSET_VERSION}`, emoji: '🧑', voice: 'alex',
  },
  {
    id: 'avatar2', label: 'Avatar', path: `${BASE}avatar-2.glb?v=${ASSET_VERSION}`, emoji: '🧑', voice: 'alex',
  },
  {
    id: 'avatar3', label: 'Avatar', path: `${BASE}avatar-3.glb?v=${ASSET_VERSION}`, emoji: '🧑', voice: 'alex',
  },
  {
    id: 'avatar4', label: 'Avatar', path: `${BASE}avatar-4.glb?v=${ASSET_VERSION}`, emoji: '👩', voice: 'dora',
  },
  {
    id: 'avatar6', label: 'Avatar', path: `${BASE}avatar-6.glb?v=${ASSET_VERSION}`, emoji: '👩', voice: 'dora',
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
        <UserIcon size={16} />
      </Button>
    ))}
  </div>
);

AvatarSwitcher.propTypes = {
  selectedId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default AvatarSwitcher;
