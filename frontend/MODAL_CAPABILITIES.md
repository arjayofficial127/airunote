# Modal Block Capabilities & Styling Guide

## What Can You Do With Modals?

### 1. **Basic Modal Functionality**
- **Open/Close State**: Modals have an `open` boolean property that controls visibility
- **Trigger Button**: Each modal has a built-in trigger button (customizable label)
- **Click Outside to Close**: Clicking the overlay closes the modal
- **Escape Key**: Press ESC to close the modal
- **Close Button**: Built-in X button in the top-right corner

### 2. **Modal ID Hook System** ⭐
The most powerful feature - trigger modals from anywhere on the page using unique IDs!

**How it works:**
- Assign a unique `modalId` to your modal block
- Any button (or other element) with the same `modalId` can trigger that modal
- Multiple triggers can open the same modal
- State is managed globally via `ModalContext`

**Example:**
```json
{
  "id": "my-modal",
  "type": "modal",
  "modalId": "contact-form",  // Unique ID
  "open": false,
  "contentBlocks": [...]
}

// Anywhere on the page:
{
  "id": "trigger-btn",
  "type": "button",
  "label": "Open Contact Form",
  "modalId": "contact-form"  // Triggers the modal above
}
```

### 3. **Rich Content Support**
Modals can contain **any block type**:
- Headings
- Text (with HTML formatting)
- Buttons
- Images
- Videos
- Containers
- Columns
- **Nested blocks**: Accordions, Tabs, Tooltips, even other Modals!

### 4. **State Persistence**
- Modal `open` state is saved in the block's JSON
- State persists across page refreshes
- Can be set to `open: true` by default

### 5. **Multiple Modals**
- You can have multiple modals on the same page
- Each can have its own unique `modalId`
- They work independently
- Can be triggered simultaneously (if needed)

## How to Style Modals

Modals support comprehensive styling through the `style` property. The styling applies to the **modal content container** (the white box), not the overlay.

### Available Style Properties

#### 1. **Spacing**
```json
{
  "style": {
    "padding": {
      "top": "32px",
      "right": "40px",
      "bottom": "32px",
      "left": "40px"
    },
    "margin": {
      "top": "20px",
      "bottom": "20px"
    }
  }
}
```

#### 2. **Background & Colors**
```json
{
  "style": {
    "backgroundColor": "#ffffff",
    "backgroundImage": "url('/path/to/image.jpg')",
    "backgroundSize": "cover",
    "backgroundPosition": "center"
  }
}
```

#### 3. **Borders & Corners**
```json
{
  "style": {
    "border": "2px solid #e5e7eb",
    "borderRadius": "16px"
  }
}
```

#### 4. **Shadows** (via advanced CSS)
```json
{
  "style": {
    "advanced": "box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);"
  }
}
```

#### 5. **Typography**
```json
{
  "style": {
    "color": "#1f2937",
    "textAlign": "center",
    "font": {
      "size": "16px",
      "weight": "400",
      "family": "Inter, sans-serif"
    }
  }
}
```

#### 6. **Layout & Sizing**
```json
{
  "style": {
    "width": "600px",
    "maxWidth": "90vw",
    "maxHeight": "90vh",
    "minWidth": "300px"
  }
}
```

#### 7. **Flexbox Layout** (for content organization)
```json
{
  "style": {
    "display": "flex",
    "flexDirection": "column",
    "justifyContent": "center",
    "alignItems": "center",
    "gap": "16px"
  }
}
```

### Complete Styling Example

```json
{
  "id": "styled-modal",
  "type": "modal",
  "modalId": "custom-modal",
  "open": false,
  "trigger": {
    "label": "Open Styled Modal"
  },
  "contentBlocks": [
    {
      "id": "modal-heading",
      "type": "heading",
      "level": "h3",
      "content": "Styled Modal",
      "style": {
        "margin": { "bottom": "16px" },
        "color": "#1f2937"
      }
    },
    {
      "id": "modal-text",
      "type": "text",
      "content": "<p>This modal has custom styling!</p>"
    }
  ],
  "style": {
    "padding": {
      "top": "32px",
      "right": "40px",
      "bottom": "32px",
      "left": "40px"
    },
    "backgroundColor": "#ffffff",
    "borderRadius": "16px",
    "maxWidth": "600px",
    "maxHeight": "90vh",
    "advanced": "box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);"
  }
}
```

### Styling the Overlay (Background)

The modal overlay (dark background) is currently hardcoded with:
- `backgroundColor: rgba(0, 0, 0, 0.5)`
- `zIndex: 1000`

To customize the overlay, you would need to modify `ModalBlockRenderer.tsx` or use global CSS with a custom class.

### Styling the Trigger Button

The trigger button uses the theme's primary colors by default. You can style it by:
1. Creating a custom button block with your own styling
2. Using the button's `style` property if you create the trigger separately

### Styling Content Inside Modals

Each content block inside the modal can have its own styling:

```json
{
  "contentBlocks": [
    {
      "id": "modal-heading",
      "type": "heading",
      "content": "Title",
      "style": {
        "margin": { "bottom": "24px" },
        "textAlign": "center",
        "color": "#1f2937"
      }
    },
    {
      "id": "modal-text",
      "type": "text",
      "content": "<p>Content</p>",
      "style": {
        "padding": { "left": "16px", "right": "16px" },
        "backgroundColor": "#f9fafb",
        "borderRadius": "8px"
      }
    }
  ]
}
```

## Advanced Use Cases

### 1. **Form Modals**
Create contact forms, login forms, or any form inside a modal:

```json
{
  "type": "modal",
  "modalId": "contact-form",
  "contentBlocks": [
    {
      "type": "heading",
      "content": "Contact Us"
    },
    {
      "type": "text",
      "content": "<p>Form fields would go here...</p>"
    }
  ]
}
```

### 2. **Confirmation Dialogs**
Use modals for confirmations:

```json
{
  "type": "modal",
  "modalId": "delete-confirmation",
  "contentBlocks": [
    {
      "type": "heading",
      "content": "Confirm Deletion"
    },
    {
      "type": "text",
      "content": "<p>Are you sure you want to delete this item?</p>"
    },
    {
      "type": "button",
      "label": "Delete",
      "url": "#"
    }
  ]
}
```

### 3. **Image Galleries**
Display images in modals:

```json
{
  "type": "modal",
  "modalId": "image-gallery",
  "contentBlocks": [
    {
      "type": "image",
      "src": "/path/to/image.jpg",
      "alt": "Gallery Image"
    }
  ]
}
```

### 4. **Nested Modals**
Modals can contain other interactive elements:

```json
{
  "type": "modal",
  "modalId": "parent-modal",
  "contentBlocks": [
    {
      "type": "heading",
      "content": "Parent Modal"
    },
    {
      "type": "button",
      "label": "Open Another Modal",
      "modalId": "child-modal"  // Triggers another modal
    }
  ]
}
```

### 5. **Tabs Inside Modals**
Organize content with tabs:

```json
{
  "type": "modal",
  "modalId": "tabs-modal",
  "contentBlocks": [
    {
      "type": "tabs",
      "activeIndex": 0,
      "tabs": [
        {
          "label": "Tab 1",
          "contentBlocks": [...]
        },
        {
          "label": "Tab 2",
          "contentBlocks": [...]
        }
      ]
    }
  ]
}
```

## Best Practices

1. **Use Unique Modal IDs**: Always assign unique `modalId` values to avoid conflicts
2. **Set Default State**: Use `open: false` for modals that should start closed
3. **Responsive Sizing**: Use `maxWidth: "90vw"` and `maxHeight: "90vh"` for mobile-friendly modals
4. **Accessible Content**: Ensure modal content is readable and well-structured
5. **Multiple Triggers**: Use the same `modalId` on multiple buttons to allow different entry points
6. **State Management**: The modal state syncs automatically with the block's `open` property

## Technical Details

- **Context Provider**: Modals use `ModalProvider` (wrapped in `PageEditorWrapper` and `PreviewModeView`)
- **State Management**: Global state via `ModalContext`, local fallback if context unavailable
- **Event Handling**: Click outside, ESC key, and close button all close the modal
- **Z-Index**: Modals use `z-index: 1000` to appear above other content
- **Scrollable**: Modal content is scrollable if it exceeds `maxHeight`

