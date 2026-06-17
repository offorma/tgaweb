#!/bin/bash
# Generate remaining images sequentially with hard timeouts - foreground

OUTDIR="/home/z/my-project/public/images"
mkdir -p "$OUTDIR"

gen_one() {
  local name="$1"
  local prompt="$2"
  local size="$3"
  
  if [ -f "$OUTDIR/$name" ] && [ -s "$OUTDIR/$name" ]; then
    echo "SKIP (exists): $name"
    return 0
  fi
  
  echo ">>> Generating: $name"
  timeout 90 z-ai image -p "$prompt" -o "$OUTDIR/$name" -s "$size" > /tmp/img-out.log 2>&1
  local rc=$?
  if [ $rc -eq 0 ] && [ -s "$OUTDIR/$name" ]; then
    echo "✓ OK: $name ($(stat -c%s "$OUTDIR/$name") bytes)"
  else
    echo "✗ FAIL: $name (rc=$rc)"
    rm -f "$OUTDIR/$name"
  fi
  sleep 3
}

gen_one "library.jpg" "African Nigerian primary school children reading books in bright colorful school library, wooden bookshelves filled with books, kids sitting on cozy reading mats, natural light, joyful learning atmosphere, professional photography, warm tones" "1344x768"

gen_one "science.jpg" "African Nigerian primary school students doing science experiment in modern lab, kids wearing safety goggles, looking through microscopes, colorful liquids in beakers, engaged learning, vibrant classroom, professional educational photography" "1344x768"

gen_one "sports.jpg" "African Nigerian primary school children playing sports on green field, kids running and playing football, joyful energetic movement, school building in background, sunny day, dynamic action shot, professional sports photography" "1344x768"

gen_one "arts.jpg" "African Nigerian primary school children in art class, painting colorful artwork on easels, creative expression, art supplies, bright inspiring classroom, joyful kids focused on creative work, professional photography" "1344x768"

gen_one "graduation.jpg" "African Nigerian primary school graduation ceremony, joyful children in graduation caps, proud parents in background, celebration moment, vibrant traditional African patterns mixed with academic gowns, professional event photography" "1344x768"

gen_one "computer-lab.jpg" "African Nigerian primary school students learning computers in modern ICT lab, kids at desks with laptops and desktop computers, focused learning, bright modern room, professional educational photography" "1344x768"

gen_one "teacher-1.jpg" "Professional portrait of confident African Nigerian female headmistress in elegant attire, warm smile, friendly approachable expression, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

gen_one "teacher-2.jpg" "Professional portrait of confident African Nigerian male teacher in smart casual shirt, warm friendly smile, approachable expression, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

gen_one "teacher-3.jpg" "Professional portrait of confident African Nigerian female teacher with elegant styling, warm welcoming smile, professional attire, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

gen_one "teacher-4.jpg" "Professional portrait of confident African Nigerian male teacher with glasses, warm friendly expression, professional shirt and tie, soft studio lighting, neutral background, professional corporate headshot photography, high quality" "864x1152"

echo ""
echo "=== Final state ==="
ls -la "$OUTDIR"
