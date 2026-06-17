#!/bin/bash
# Generate all images for Trail Gliders Academy website - SEQUENTIALLY to avoid rate limits


OUTDIR="/home/z/my-project/public/images"
mkdir -p "$OUTDIR"

# Wait between calls to avoid rate limits
DELAY=5

gen() {
  local name="$1"
  local prompt="$2"
  local size="$3"
  
  if [ -f "$OUTDIR/$name" ]; then
    echo "SKIP (exists): $name"
    return 0
  fi
  
  echo ">>> Generating: $name ($size)"
  if z-ai image -p "$prompt" -o "$OUTDIR/$name" -s "$size" 2>&1 | tail -5; then
    echo "✓ Done: $name"
  else
    echo "✗ Failed: $name, retrying after delay..."
    sleep 20
    z-ai image -p "$prompt" -o "$OUTDIR/$name" -s "$size" 2>&1 | tail -3
  fi
  sleep $DELAY
}

# Hero background - landscape
gen "hero.jpg" "Joyful African Nigerian primary school children in modern colorful classroom raising hands enthusiastically, diverse group of black students in school uniforms, warm natural sunlight streaming through large windows, vibrant orange and navy blue accents, professional educational photography, high quality, cinematic depth of field, aspirational mood" "1344x768"

# Campus building
gen "campus.jpg" "Beautiful modern primary school building in Nigeria with African architectural influences, clean white walls with orange and navy blue trim, palm trees, well-manicured lawn, blue sky, professional architectural photography, warm afternoon light, welcoming entrance" "1344x768"

# Library
gen "library.jpg" "African Nigerian primary school children reading books in bright colorful school library, wooden bookshelves filled with books, kids sitting on cozy reading mats, natural light, joyful learning atmosphere, professional photography, warm tones" "1344x768"

# Science
gen "science.jpg" "African Nigerian primary school students doing science experiment in modern lab, kids wearing safety goggles, looking through microscopes, colorful liquids in beakers, engaged learning, vibrant classroom, professional educational photography" "1344x768"

# Sports
gen "sports.jpg" "African Nigerian primary school children playing sports on green field, kids running and playing football, joyful energetic movement, school building in background, sunny day, dynamic action shot, professional sports photography" "1344x768"

# Arts
gen "arts.jpg" "African Nigerian primary school children in art class, painting colorful artwork on easels, creative expression, art supplies, bright inspiring classroom, joyful kids focused on creative work, professional photography" "1344x768"

# Graduation
gen "graduation.jpg" "African Nigerian primary school graduation ceremony, joyful children in graduation caps, proud parents in background, celebration moment, vibrant traditional African patterns mixed with academic gowns, professional event photography" "1344x768"

# Computer lab
gen "computer-lab.jpg" "African Nigerian primary school students learning computers in modern ICT lab, kids at desks with laptops and desktop computers, focused learning, bright modern room, professional educational photography" "1344x768"

# Teacher portraits - portrait orientation
gen "teacher-1.jpg" "Professional portrait of confident African Nigerian female headmistress in elegant attire, warm smile, friendly approachable expression, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

gen "teacher-2.jpg" "Professional portrait of confident African Nigerian male teacher in smart casual shirt, warm friendly smile, approachable expression, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

gen "teacher-3.jpg" "Professional portrait of confident African Nigerian female teacher with elegant styling, warm welcoming smile, professional attire, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

gen "teacher-4.jpg" "Professional portrait of confident African Nigerian male teacher with glasses, warm friendly expression, professional shirt and tie, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

echo ""
echo "=== All image generation complete ==="
ls -la "$OUTDIR"
