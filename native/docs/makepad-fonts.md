# Makepad Font Resource

The Gallery embeds the complete, unmodified `LXGWXiHeiMN` modern glyph set as
`native/crates/tessera-gallery/resources/fonts/LXGWXiHeiMN.ttf.zlib`.

- Source: `https://github.com/lxgw/LxgwXiHei/releases/tag/v1.001`
- Source file: `LXGWXiHeiMN.ttf`
- Source SHA-256: `e29b6388cff06d2c9f665a5f8bb2e2d832793a4f3a5aeaeb74622bf14a27eb5b`
- License: IPA Font License 1.0; the license text is included beside the resource.

The zlib stream is lossless compression, not a subset or a modified font. All
original glyphs, font names and tables are retained. Reproduce it with Python's
standard library, after downloading the pinned release file:

```sh
python3 native/scripts/prepare-xihei-font.py /path/to/LXGWXiHeiMN.ttf
```

`tessera-gallery/src/resources.rs` uses `include_bytes!` and the already pinned
Makepad inflate library to decode the trusted asset once at startup. Makepad's
resource registry retains and shares the decoded bytes across font handles and
theme changes. No font file, network request, temporary extraction, or installed
host font is needed for these default text families. The sidebar logo is embedded
the same way. The macOS package includes this notice and the font license in
`Contents/Resources/Notices`.

Font acceptance requires inspection of real Light/Dark CJK text, symbols and
the sidebar logo from the packaged application. Embedded-byte integrity tests
do not establish glyph rendering, IME or accessibility acceptance.
