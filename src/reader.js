
export class TextReader {
    constructor(text) {
        this._input = text.trim();
        this._index = 0;
    }

    peek() {
        if (this._index >= this._input.length)
            return null;
        return this._input.charAt(this._index);
    }

    expectText(value) {
        let initial = this._index;

        let data = '';

        while (value !== data && value.startsWith(data)) {
            data += this.peek();
            this.advanceSimple();
        }

        if (this.peek() === ' ')
            this.advance();

        if (value === data) {
            return true;
        }

        this._index = initial;
        return false;
    }

    expectRegex(regex) {
        let initial = this._index;

        let data = '';

        while (data === '' || regex.test(data)) {
            if (!this.peek()) {
                data += ' ';
                this._index++;
                break;
            }
            data += this.peek();
            this.advanceSimple();
        }

        data = data.slice(0, -1);
        this._index--;

        if (this.peek() === ' ')
            this.advance();

        if (regex.test(data)) {
            return data;
        }

        this._index = initial;
        return null;
    }

    advanceSimple() {
        this._index++;
    }

    skipSpaces() {
        if (this.hasNext() && this.peek() === ' ')
            this.advance();
    }

    advance() {
        // skip over spaces
        do {
            this._index++;
        } while (this.hasNext() && this.peek() === ' ');
        return true;
    }

    hasNext() {
        return this._index < this._input.length;
    }

    getPosition() {
        return this._index;
    }
}