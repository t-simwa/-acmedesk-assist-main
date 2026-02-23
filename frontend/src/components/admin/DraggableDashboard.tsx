import { ReactNode, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface DraggableItemProps {
  id: string;
  children: ReactNode;
}

function DraggableItem({ id, children }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }),
    [transform, transition, isDragging]
  );

  return (
    <div ref={setNodeRef} style={style} className="relative min-w-0">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 h-full w-8 sm:w-7 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors z-10 touch-none"
        aria-hidden
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="pl-8 sm:pl-7 min-w-0">{children}</div>
    </div>
  );
}

interface DraggableDashboardProps {
  items: Array<{ id: string; component: ReactNode }>;
  onReorder: (newOrder: string[]) => void;
}

export function DraggableDashboard({ items, onReorder }: DraggableDashboardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = itemIds.indexOf(active.id as string);
        const newIndex = itemIds.indexOf(over.id as string);
        const newOrder = arrayMove(itemIds, oldIndex, newIndex);
        onReorder(newOrder);
      }
    },
    [itemIds, onReorder]
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-5 sm:space-y-6 min-w-0">
          {items.map((item) => (
            <DraggableItem key={item.id} id={item.id}>
              {item.component}
            </DraggableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
