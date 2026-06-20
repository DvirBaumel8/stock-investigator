import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("tickers")
export class Ticker {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column({ length: 5 })
  symbol: string;

  @Column()
  companyName: string;

  @Column()
  exchange: string;

  @Column()
  assetType: string;
}
