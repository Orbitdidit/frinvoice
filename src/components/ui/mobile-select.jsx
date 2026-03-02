import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileSelect({
  value,
  onValueChange,
  placeholder,
  children,
  className,
  triggerClassName,
  disabled
}) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const items = React.Children.toArray(children).filter(
    child => React.isValidElement(child) && child.type === SelectItem
  );

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn(className, triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }

  const selectedItem = items.find(item => item.props.value === value);
  const displayValue = selectedItem ? selectedItem.props.children : placeholder;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
            triggerClassName
          )}
        >
          {displayValue}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{placeholder || "Select an option"}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 max-h-[60vh] overflow-auto">
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.props.value}
                onClick={() => {
                  onValueChange(item.props.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-lg border transition-colors",
                  value === item.props.value
                    ? "bg-purple-50 border-purple-200 text-purple-900"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                )}
              >
                <span className="font-medium">{item.props.children}</span>
                {value === item.props.value && (
                  <Check className="w-5 h-5 text-purple-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export { SelectItem };