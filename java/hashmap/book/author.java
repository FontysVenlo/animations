import java.util.Objects;

public class Book {

    private final String isbn;
    private final String title;
    private final String author;

    public Book(String isbn, String title, String author) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
    }

    @Override
    public String toString() {
        return title + " by " + author + " (" + isbn + ")";
    }

    @Override
    public int hashCode() {
        System.out.println("Calling hashCode on " + this); // @hash.print
        return Objects.hashCode(this.author); // @hash.return
    }

    @Override
    public boolean equals(Object obj) {
        System.out.println("Comparing to " + obj); // @eq.print
        if (this == obj) { // @eq.same
            return true; // @eq.same-true
        }
        if (obj == null) { // @eq.null
            return false;
        }
        if (getClass() != obj.getClass()) { // @eq.class
            return false;
        }
        final Book other = (Book) obj; // @eq.cast
        if (!Objects.equals(this.isbn, other.isbn)) { // @eq.isbn
            return false; // @eq.isbn-false
        }
        if (!Objects.equals(this.title, other.title)) { // @eq.title
            return false; // @eq.title-false
        }
        return Objects.equals(this.author, other.author); // @eq.author
    }
}
