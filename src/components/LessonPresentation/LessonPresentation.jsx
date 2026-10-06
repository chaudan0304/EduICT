import React from 'react';
import PresentationView from './PresentationView';
import LinkedPowerPointPresentation from './LinkedPowerPointPresentation';

export default function LessonPresentation(props) {
  return props.lesson?.type === 'linked_powerpoint'
    ? <LinkedPowerPointPresentation {...props} />
    : <PresentationView {...props} />;
}
