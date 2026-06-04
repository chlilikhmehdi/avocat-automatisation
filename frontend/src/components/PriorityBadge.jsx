import { Badge } from '@chakra-ui/react';

const priorityColors = {
  'Rouge': 'red',
  'Orange': 'orange',
  'Vert': 'green'
};

const PriorityBadge = ({ priority }) => {
  const colorScheme = priorityColors[priority] || 'gray';
  
  return (
    <Badge colorScheme={colorScheme} px={2} py={1} borderRadius="md" variant="solid">
      {priority}
    </Badge>
  );
};

export default PriorityBadge;
