#///////////////////////////#
#         PROJECT 1         #
#///////////////////////////#

# Import csv data
t01<-read.csv("~/Desktop/Project1/data/demographic/01.csv", head=TRUE, sep=";", stringsAsFactors=FALSE)
AREAS<-read.csv("~/Desktop/Project1/data/areas.csv", head=TRUE, sep=",", stringsAsFactors=FALSE)

# Clean table
TOTAL_<-t01[t01[,"GROUP"]=="Total",]
TOTAL_<-TOTAL_[setdiff(grep(".*",TOTAL_$NAME), grep("CA .. ",TOTAL_$NAME)) ,]

# Remove "CA" prefix
TOTAL <- data.frame()
TOTAL <- TOTAL_
for (i in 2:NROW(TOTAL_)) {
  TOTAL[i,"NAME"] = gsub("CA ", "", TOTAL_[i,"NAME"]);
}

write.table(TOTAL, file ="~/Desktop/Project1/data/demographic/01_total.csv",row.names=FALSE,sep=",",quote=FALSE)

# GENDER
GENDER<-TOTAL[,c("NAME","MTOT","FTOT","TTOT")]
GENDER<-GENDER[3:80,]

    # check if sum of population is coherent with given data
    sum=0;
    for (i in 4:80) {
      sum = sum + GENDER_[i,"TTOT"];
    }

write.table(GENDER, file ="~/Desktop/Project1/data/demographic/01_gender.csv",row.names=FALSE,sep=",",quote=FALSE)

# AGE
AGE<-TOTAL[,c("NAME")]
AGE <- cbind(AGE, subset(TOTAL, select = T0004:T75_OVER))
AGE <- AGE[3:80,]

AGE_ <- data.frame()
AGE_ <- AGE[,1]
for(i in seq(2,16,2)){
  newcol <- list()
  for(j in 1:NROW(AGE))
  newcol <- c(newcol, AGE[j,i] + AGE[j,i+1])
  AGE_ <- cbind(AGE_, newcol)
}
AGE_ <- cbind(AGE_, AGE[,"T75_OVER"])

write.table(AGE, file ="~/Desktop/Project1/data/demographic/01_age_det.csv",row.names=FALSE,sep=",",quote=FALSE)
write.table(AGE_, file ="~/Desktop/Project1/data/demographic/01_age_gen.csv",row.names=FALSE,sep=",",quote=FALSE)


