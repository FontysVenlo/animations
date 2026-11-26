public class Motorcycle extends MotorizedVehicle {

    public Motorcycle(String brand, String model, Engine engine) {
        super(brand, model, engine);
    }

    @Override
    public void start() { // @start
        System.out.println("Press the start button of the " + this); // @start.print
        startEngine(); // @start.engine
    }
}
