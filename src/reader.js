
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