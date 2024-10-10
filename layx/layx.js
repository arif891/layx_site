/* Theme */
import Theme from "./others/theme/theme.js";

/* Components */
import Navbar from "./components/navbar/navbar.js";
import Dialog from "./components/dialog/dialog.js";
import {Sheet} from "./components/sheet/sheet.js";

/* Other */
import CodeHighlighter from "./others/syntax_highlighter/syntax_highlighter.js";

const mediaQuery = window.matchMedia('(max-width: 992px)');

if (mediaQuery.matches) {
    new Sheet('#side-nav');
}